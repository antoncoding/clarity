import { AGENT_MESSAGES, processAgentResponse } from "./utils";
import { getAgent, mainSearchToolName } from "./llm";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { AgentDBService } from "./db";
import { createAdminClient } from "../supabase/admin";

// Re-export for backward compatibility
export { AGENT_MESSAGES } from "./utils";

export const newsPrompt = `You provide informative responses about news topics. Current date and time is ${new Date().toISOString()}. Response with user's language, be careful to distinguish between Simplified Chinese and Traditional Chinese.

You need to break a search task into 2 parts: Namely "Search" and "Analysis"

On the Search step: Try to diversify the search tools, Some guidelines: 
* use ${mainSearchToolName} to search for news related data
* If the request is related to a region that used a non-English language, try to search with both English and local language (NOT user's language)
* Try multiple iterations with different search queries, to diversify the search results and find the most relevant ones
* use WebBrowser to search to parse the web page and extract the content when the search result is not complete
* use Wikipedia when you need knowledge on topics that's less time sensitive, but proof and truth is more important.

On the Analysis step: Try to
* If the request is time sensitive (refer to a specific time frame like last week, or recently), make sure the data you receive is up to date, and ignore the old news
* Breakdown each news source and filter out the underlying ideology. Find the common ground across sources.
* Highlight the "truth" shared by different sources, clearly separate them from "arguments" that are only provided by each side.
* Always see things from different angle. Go back to search for more material if you need to.

Return in markdown format if you need to highlight the sources
`

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
  userMessageId: string,
  conversationId: string,
  message: string
) => {
  try {
    console.log(`🔄 Agent: Processing message for conversation ID: ${conversationId}`);
    console.log(`💬 Agent: Message: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    
    // Initialize the database service
    const dbService = await AgentDBService.getInstance();
    
    // Get conversation history for context
    const conversationHistory = await dbService.getConversationHistory(conversationId);
    
    const formattedHistory = formatMessagesForAgent(conversationHistory);
    
    console.log(`📚 Agent: Including ${formattedHistory.length} messages from conversation history`);
    
    const agent = getAgent(conversationId);
    
    const finalHistory = [{ role: "system", content: newsPrompt }, ...formattedHistory];

    console.log(`📚 Agent: Including ${finalHistory.length} messages in final history`);
    
    // Invoke with the complete message history
    const result = await agent.invoke(
      { messages: finalHistory },
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
