import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { withAuth } from "@/utils/api-middleware";
import { getAgent, processMessage } from "@/utils/agent";

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

    // Create an agent message in "processing" state using admin client
    const { data: agentMessageData, error: agentMessageError } = await adminClient
      .from("messages")
      .insert([
        {
          conversation_id: actualConversationId,
          content: "Processing your message...",
          sender: "agent",
          status: "processing",
        },
      ])
      .select("id")
      .single();

    if (agentMessageError || !agentMessageData) {
      console.error("❌ Error inserting agent message:", agentMessageError);
      return NextResponse.json(
        { error: "Error sending message" },
        { status: 500 }
      );
    }

    console.log(`✅ Agent processing message inserted: ${agentMessageData.id}`);

    // Invoke agent asynchronously
    processAgentMessage(
      userId,
      message,
      messageData.id,
      agentMessageData.id,
      actualConversationId
    );

    return NextResponse.json({
      success: true,
      messageId: messageData.id,
      agentMessageId: agentMessageData.id,
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
  agentMessageId: string,
  conversationId: string
) {
  // Use admin client for updating messages
  const adminClient = createAdminClient();

  try {
    console.log(`🤖 Processing agent response for message: ${userMessageId}`);
    
    // Call the agent to process the message using the correct API
    const agentResponse = await processMessage(conversationId, userMessage);

    // Update the agent message with the response using admin client
    const { error: updateError } = await adminClient
      .from("messages")
      .update({
        content: agentResponse,
        status: "completed",
      })
      .eq("id", agentMessageId);

    if (updateError) {
      console.error("❌ Error updating agent message:", updateError);
      throw updateError;
    }

    console.log(`✅ Agent response completed for message: ${agentMessageId}`);
  } catch (error) {
    console.error("❌ Error in agent processing:", error);
    
    // Update the message with an error status using admin client
    await adminClient
      .from("messages")
      .update({
        content: "Sorry, there was an error processing your request.",
        status: "error",
      })
      .eq("id", agentMessageId);
  }
}
