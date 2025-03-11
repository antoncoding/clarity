import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { withAuth } from "@/utils/api-middleware";
import { processMessage } from "@/utils/agent";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    // Parse the request body
    const { messageId, query, conversationId } = await req.json();
    
    console.log(`📨 Processing news request for message: ${messageId}`);
    console.log(`🔍 Query: ${query}`);
    console.log(`💬 Conversation ID: ${conversationId}`);
    
    if (!messageId || !query || !conversationId) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields (messageId, query, or conversationId)" },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Verify that the message belongs to the user
    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .eq("id", messageId)
      .single();
      
    if (messageError || !messageData) {
      console.error("❌ Message not found:", messageError);
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }
    
    // Verify that the conversation belongs to the user
    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();
      
    if (conversationError || !conversationData) {
      console.error("❌ Conversation not found or not owned by user");
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    
    // Update message status to processing
    const { error: updateError } = await supabase
      .from("messages")
      .update({ status: "processing" })
      .eq("id", messageId);
      
    if (updateError) {
      console.error("❌ Error updating message status:", updateError);
      return NextResponse.json(
        { error: "Error updating message status" },
        { status: 500 }
      );
    }
    
    try {
      console.log("🤖 Processing message with agent...");
      
      // Process the message with the agent
      const response = await processMessage(conversationId, query);
      
      console.log("✅ Agent processing complete");
      
      // Update the message with the response
      const { error: finalUpdateError } = await supabase
        .from("messages")
        .update({
          content: response,
          status: "completed",
        })
        .eq("id", messageId);
        
      if (finalUpdateError) {
        console.error("❌ Error updating message with response:", finalUpdateError);
        throw finalUpdateError;
      }
      
      return NextResponse.json({ success: true });
    } catch (processingError) {
      console.error("❌ Error processing message:", processingError);
      
      // Update the message with error status
      await supabase
        .from("messages")
        .update({
          content: "Sorry, there was an error processing your request.",
          status: "error",
        })
        .eq("id", messageId);
        
      return NextResponse.json(
        { error: "Error processing message" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Unexpected error in process-news API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
