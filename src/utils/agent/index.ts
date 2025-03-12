import { createClient } from "@/utils/supabase/server";
import { AGENT_MESSAGES, processAgentResponse } from "./utils";
import { getAgent } from "./llm";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";


// Re-export for backward compatibility
export { AGENT_MESSAGES } from "./utils";

export const newsPrompt = `You provide informative responses about news topics. Current date and time is ${new Date().toISOString()}. You search for news related to a certain query. 

You need to break the task into 2 parts: Namely "Search" and "Analysis"

On the Search step: Try to diversify the search tools, Some guidelines: 
* use DuckDuckGo to search for more entries on specific query
* use TAVILY only when you can't find more diversified answers
* use Wikipedia when you need knowledge on topics that's less time sensitive, but proof and truth is more important.

On the Analysis step: Try to
* Breakdown each news source and filter out the underlying ideology. Try to find the common ground across multiple sources.
* It's important to highlight the "truth" shared by different sources, deprioritize "arguments" that were only provided each side.
* Try to always see things from different angle, and put that into the final report. You can go back to search for more material at this step.

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
 * Fetch conversation history from the database
 */
async function getConversationHistory(conversationId: string) {
  console.log(`📚 Getting conversation history for: ${conversationId}`);
  
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
      
    if (error) {
      console.error("Error fetching conversation history:", error);
      return [];
    }
    
    console.log(`📚 Fetched ${data.length} messages from conversation history`);
    return data;
  } catch (error) {
    console.error("Error in getConversationHistory:", error);
    return [];
  }
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
  message: string
) => {
  try {
    console.log(`🔄 Agent: Processing message for conversation ID: ${conversationId}`);
    console.log(`💬 Agent: Message: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
    
    // Get conversation history for context
    const conversationHistory = await getConversationHistory(conversationId);
    
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

    console.log('typeof', typeof messages)
    console.log('messages', messages.length)


    console.log(`✅ Agent: Agent processing complete`);
    
    // Use the utility function to process the agent response
    const processedResponse = processAgentResponse(messages);
    console.log(`🔍 Agent: Processed ${processedResponse.messages.length} agent messages`);
    
    return processedResponse;
  } catch (error) {
    console.error(`❌ Agent: Error processing message:`, error);
    return {
      response: AGENT_MESSAGES.ERROR,
      messages: [{
        type: 'message',
        content: AGENT_MESSAGES.ERROR,
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      }]
    };
  }
};
