import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { withAuth } from "@/utils/api-middleware";
import { processMessage } from "@/utils/agent";

// Handle the POST request for sending messages
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Parse the request body
    const body = await req.json();
    const { message, conversationId } = body;

    console.log(`📨 Received message from user ${userId}`);
    
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    // Use admin client for operations that need to bypass RLS
    const adminClient = createAdminClient();

    // Create a new conversation if one doesn't exist
    let actualConversationId = conversationId;
    if (!actualConversationId) {
      console.log("🔄 Creating new conversation");
      
      // Create a new conversation in the database using admin client to bypass RLS
      const { data: newConversation, error: conversationError } = await adminClient
        .from("conversations")
        .insert([{ user_id: userId, title: message.substring(0, 50) }])
        .select("id")
        .single();

      if (conversationError || !newConversation) {
        console.error("❌ Error creating conversation:", conversationError);
        return NextResponse.json(
          { error: "Error creating conversation" },
          { status: 500 }
        );
      }

      actualConversationId = newConversation.id;
      console.log(`✅ New conversation created: ${actualConversationId}`);
    } else {
      // Verify the user owns this conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", actualConversationId)
        .eq("user_id", userId)
        .single();
        
      if (conversationError || !conversationData) {
        console.error("❌ Conversation not found or not owned by user");
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    }

    // Add the message to the database using admin client to bypass RLS
    const { data: messageData, error: messageError } = await adminClient
      .from("messages")
      .insert([
        {
          conversation_id: actualConversationId,
          content: message,
          sender: "user",
          status: "sent",
        },
      ])
      .select("id")
      .single();

    if (messageError || !messageData) {
      console.error("❌ Error inserting message:", messageError);
      return NextResponse.json(
        { error: "Error sending message" },
        { status: 500 }
      );
    }

    console.log(`✅ User message inserted: ${messageData.id}`);


    // Invoke agent asynchronously
    processAgentMessage(
      userId,
      message,
      messageData.id,
      actualConversationId
    );

    return NextResponse.json({
      success: true,
      messageId: messageData.id,
      conversationId: actualConversationId,
    });
  } catch (error) {
    console.error("❌ Unexpected error in chat API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

// Function to process the agent response asynchronously
async function processAgentMessage(
  userId: string,
  userMessage: string,
  userMessageId: string,
  conversationId: string
) {
  // Use admin client for updating messages
  const adminClient = createAdminClient();

  try {
    console.log(`🤖 Processing agent response for message: ${userMessageId}`);
    
    // Call the agent to process the message using the correct API
    const { response, messages } = await processMessage(conversationId, userMessage);
    
    console.log(`✅ Agent received response of length: ${response.length}`);
    console.log(`📊 Agent generated ${messages.length} total messages`);

    // Store ALL messages from the agent (thoughts, tool operations, and final messages)
    if (messages.length > 0) {
      console.log(`🧠 Inserting ${messages.length} messages & thoughts`);
      
      // Prepare the messages for insertion
      const messagesToInsert = messages.map((m: any) => ({
        conversation_id: conversationId,
        content: m.content,
        sender: "agent",
        status: "completed",
        message_type: m.type,
        metadata: m.metadata || {}
      }));
      
      // Insert all messages
      const { error: insertError } = await adminClient
        .from("messages")
        .insert(messagesToInsert);
        
      if (insertError) {
        console.error("❌ Error inserting agent messages:", insertError);
        // Don't throw here - we've already updated the main message
      }

      // change the user message status to responded
      const { error: updateError } = await adminClient
        .from("messages")
        .update({ status: "responded" })
        .eq("id", userMessageId);

      if (updateError) {
        console.error("❌ Error updating user message status:", updateError);
      }
        
    }

    console.log(`✅ Agent response completed for message: ${userMessageId}`);
  } catch (error) {
    console.error("❌ Error in agent processing:", error);
    
  }
}
