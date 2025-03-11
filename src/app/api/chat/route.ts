import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { withAuth } from "@/utils/api-middleware";

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  console.log(" API: /api/chat - Processing new message request");
  try {
    const supabase = createClient();
    
    // Parse the request body
    const body = await request.json();
    const { message, conversationId } = body;
    console.log(` Received message: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    console.log(` Conversation ID: ${conversationId || 'New conversation'}`);
    
    if (!message) {
      console.log(" Missing message content");
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }
    
    let currentConversationId = conversationId;
    
    // If no conversation ID is provided, create a new conversation
    if (!currentConversationId) {
      console.log(" Creating new conversation...");
      const { data: newConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          title: message.substring(0, 30) + (message.length > 30 ? "..." : ""),
        })
        .select("id")
        .single();
      
      if (conversationError) {
        console.error(" Error creating conversation:", conversationError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }
      
      currentConversationId = newConversation.id;
      console.log(` New conversation created: ${currentConversationId}`);
    }
    
    // Insert the user message
    console.log(" Saving user message...");
    const userMessageId = uuidv4();
    const { error: userMessageError } = await supabase
      .from("messages")
      .insert({
        id: userMessageId,
        conversation_id: currentConversationId,
        content: message,
        sender: "user",
        status: "completed",
      });
    
    if (userMessageError) {
      console.error(" Error inserting user message:", userMessageError);
      return NextResponse.json(
        { error: "Failed to insert user message" },
        { status: 500 }
      );
    }
    console.log(` User message saved with ID: ${userMessageId}`);
    
    // Insert a placeholder agent message
    console.log(" Creating placeholder agent message...");
    const agentMessageId = uuidv4();
    const { error: agentMessageError } = await supabase
      .from("messages")
      .insert({
        id: agentMessageId,
        conversation_id: currentConversationId,
        content: "Processing your request...",
        sender: "agent",
        status: "processing",
      });
    
    if (agentMessageError) {
      console.error(" Error inserting agent message:", agentMessageError);
      return NextResponse.json(
        { error: "Failed to insert agent message" },
        { status: 500 }
      );
    }
    console.log(` Agent message created with ID: ${agentMessageId}`);
    
    // Trigger the background processing
    console.log(" Triggering background processing...");
    const origin = request.headers.get("origin") || '';
    // We don't await this to keep the response time fast
    fetch(`${origin}/api/process-news`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward auth cookie
        "Cookie": request.headers.get("cookie") || '',
      },
      body: JSON.stringify({
        messageId: agentMessageId,
        query: message,
        conversationId: currentConversationId,
      }),
    }).catch(error => {
      console.error(" Error triggering background process:", error);
    });
    
    // Return the conversation ID and message IDs
    console.log(" Chat API request completed successfully");
    return NextResponse.json({
      conversationId: currentConversationId,
      userMessageId,
      agentMessageId,
    });
    
  } catch (error) {
    console.error(" Error in chat API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
