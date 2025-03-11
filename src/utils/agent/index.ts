import { createClient } from "@/utils/supabase/server";
import { AGENT_MESSAGES, processAgentResponse } from "./utils";
import { getAgent } from "./llm";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";


// Re-export for backward compatibility
export { AGENT_MESSAGES } from "./utils";

export const newsPrompt = `You are a helpful news assistant. Please provide informative responses about news topics. Today is ${new Date().toLocaleDateString()}. You search for news related to a certain query, and stay objective to only return facts, and focus on how different media report differnet things.`

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
}>) {
  return messages.map(msg => ({
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
    console.log('Final history:', JSON.stringify(finalHistory, null, 2));

    
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
    console.log(`💬 Agent: Agent response:`, JSON.stringify(messages, null, 2));
    
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
