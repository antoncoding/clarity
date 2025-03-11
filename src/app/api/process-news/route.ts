import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { processMessage } from "@/utils/agent";
import { withAuth } from "@/utils/api-middleware";

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  console.log("📝 API: /api/process-news - Processing message");
  try {
    const supabase = createClient();
    
    // Parse the request body
    const { messageId, query, conversationId } = await request.json();
    console.log(`🔍 Processing query: "${query.substring(0, 30)}${query.length > 30 ? '...' : ''}"`);
    console.log(`📝 Message ID: ${messageId}`);
    console.log(`💬 Conversation ID: ${conversationId}`);
    
    if (!messageId || !query || !conversationId) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { error: "messageId, query, and conversationId are required" },
        { status: 400 }
      );
    }
    
    // Process the message using the agent
    console.log("🤖 Invoking agent to process message...");
    const agentResponse = await processMessage(conversationId, query);
    console.log("✅ Agent processing complete");
    
    // Update the agent message with the response
    console.log("🔄 Updating agent message with response...");
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        content: agentResponse,
        status: "completed",
      })
      .eq("id", messageId);
    
    if (updateError) {
      console.error("❌ Error updating message:", updateError);
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: 500 }
      );
    }
    console.log("✅ Message updated successfully");
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error in process-news API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
