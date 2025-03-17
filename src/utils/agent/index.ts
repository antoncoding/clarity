import { AGENT_MESSAGES, processAgentResponse } from "./utils";
import { agent } from "./llm";
// import { supervisor } from "./supervisor";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { AgentDBService } from "./db";
import { createAdminClient } from "../supabase/admin";

// Re-export for backward compatibility
export { AGENT_MESSAGES } from "./utils";

export type RawMessage = {
  id: string[] | string,
  kwargs: {
    content: string | string[] | Array<{type: string, text?: string, id?: string, name?: string, input?: any}>,
    additional_kwargs?: any,
    response_metadata?: any,
    tool_calls?: Array<{name: string, args?: any, arguments?: string, id: string, type?: string}>,
    tool_call_id?: string,
    usage_metadata?: any,
    name?: string,
    id?: string,
    invalid_tool_calls?: Array<string>
  },
  lc: number,
  type: string,
}

/**
 * Format conversation history into prompt-friendly format
 */
function formatMessagesForAgent(messages: Array<{
  sender: string;
  content: string;
  message_type?: string;
}>) {

  // We want to
  // 1. Remove all tool_call type, (intermediate messages like "Let me think about this")
  // 2. Remove all tool results that were too old
  const filteredMessages = messages.filter(msg => msg.message_type !== "tool_call")

  // Remove tool_result that not the last 8 messages
  const LOOKBACK = 8;
  const length = filteredMessages.length;
  const relevantMessages = filteredMessages
    .filter((msg, idx) => {
      return msg.message_type !== "tool_result" || idx >= length - LOOKBACK
    })

  return relevantMessages.map(msg => ({
    role: msg.sender === "user" ? "user" : "assistant",
    content: msg.content
  }));
}

/**
 * Process a user message with the agent
 */
export const processMessage = async (
  conversationId: string,
  message: string,
  userId: string
) => {
  try {
    console.log(`🔄 Agent: Processing message for conversation ID: ${conversationId}`);
    console.log(`💬 Agent: Message: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    
    // Initialize the database service for this specific user
    const dbService = await AgentDBService.createForUser(userId);
    
    // Get conversation history for context
    const conversationHistory = await dbService.getConversationHistory(conversationId);
    
    const formattedHistory = formatMessagesForAgent(conversationHistory);
    
    console.log(`📚 Agent: Including ${formattedHistory.length} messages from conversation history`);
    
    // Invoke with the complete message history
    const result = await agent.invoke(
      { messages: formattedHistory },
      { configurable: { thread_id: conversationId } }
    );
    
    // only fetch messages after users' 
    const messages = result.messages as (HumanMessage | AIMessage | ToolMessage)[] 

    console.log(`✅ Agent: Agent processing complete`);
    
    // Use the utility function to process the agent response
    const processedResponse = processAgentResponse(messages);
    console.log(`📊 Agent: Token usage - Input: ${processedResponse.input_tokens}, Output: ${processedResponse.output_tokens}, Cost: $${processedResponse.cost.toFixed(4)}`);
    
    // Store usage statistics in the database
    try {
      // Create a fresh service role client each time, bypassing the singleton
      const client = createAdminClient()
      const adminDbService = new AgentDBService(client); // Directly create instance
      
      // Get user ID associated with the conversation
      const userId = await adminDbService.getConversationUserId(conversationId);
      
      if (userId) {
        // Update conversation-level usage
        await adminDbService.updateConversationUsage(
          userId,
          conversationId,
          processedResponse.input_tokens,
          processedResponse.output_tokens,
          processedResponse.cost
        );
        
        // Update user-level usage
        await adminDbService.updateUserUsage(
          userId,
          processedResponse.cost
        );
      } else {
        console.warn("User ID not found for conversation, skipping usage updates");
      }
    } catch (statsError) {
      console.error("Failed to store usage statistics:", statsError);
      // Continue with response even if stats storage fails
    }
    
    return processedResponse;
  } catch (error) {
    console.error(`❌ Agent: Error processing message:`, error);
    return {
      response: AGENT_MESSAGES.ERROR,
      messages: [{
        type: 'message',
        content: AGENT_MESSAGES.ERROR,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      }],
      input_tokens: 0,
      output_tokens: 0,
      cost: 0
    };
  }
};
