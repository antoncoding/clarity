import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/utils/api-middleware";
import { processMessage } from "@/utils/agent";
import { AgentDBService } from "@/utils/agent/db";

// Handle the POST request for sending messages
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Parse the request body
    const body = await req.json();
    const { message, conversationId } = body;

    console.log(`📨 Received message from user ${userId}, Conversation Id ${conversationId}`);
    
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Initialize the database service
    const dbService = await AgentDBService.getInstance();

    // Create a new conversation if one doesn't exist
    let actualConversationId = conversationId;
    if (!actualConversationId) {
      console.log("🔄 Creating new conversation");
      
      // Create a new conversation in the database
      const newConversation = await dbService.createConversation(
        userId, 
        message.substring(0, 50)
      );

      actualConversationId = newConversation.id;
      console.log(`✅ New conversation created: ${actualConversationId}`);
    } else {
      // Verify the user owns this conversation
      const isOwner = await dbService.verifyConversationOwnership(
        actualConversationId,
        userId
      );
        
      if (!isOwner) {
        console.error("❌ Conversation not found or not owned by user");
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    }

    // Add the user message to the database (shows up on UI)
    const messageData = await dbService.insertMessage(
      actualConversationId,
      message,
      "user",
      "sent"
    );

    console.log(`✅ User message inserted: ${messageData.id}`);

    // Invoke agent asynchronously
    processNewUserMessage(
      message,
      messageData.id,
      actualConversationId,
    );

    return NextResponse.json({
      success: true,
      messageId: messageData.id,
      conversationId: actualConversationId,
    }, { status: 200 });
  } catch (error) {
    console.error("❌ Unexpected error in chat API:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
});

// Function to process the agent response asynchronously
async function processNewUserMessage(
  userMessage: string,
  userMessageId: string,
  conversationId: string,
) {
  // Initialize the database service
  const dbService = await AgentDBService.getInstance();

  try {
    console.log(`🤖 Processing agent response for message: ${userMessageId}`);
    
    // Call the agent to process the message
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
      await dbService.insertAgentMessages(messagesToInsert);

      // change the user message status to responded
      await dbService.updateMessageStatus(userMessageId, "responded");
    }

    console.log(`✅ Agent response completed for message: ${userMessageId}`);
  } catch (error) {
    console.error("❌ Error in agent processing:", error);
  }
}
