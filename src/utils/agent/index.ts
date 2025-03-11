import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { AGENT_MESSAGES, processAgentResponse } from "./utils";

// Re-export for backward compatibility
export { AGENT_MESSAGES } from "./utils";

// Define a news search tool using Tavily
const searchNewsTavily = new TavilySearchResults({
  maxResults: 3,
  apiKey: process.env.TAVILY_API_KEY,
});

// Create a map of thread IDs to agent instances
const agentInstances = new Map();

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
 * Get or create an agent instance for a specific conversation
 */
export const getAgent = (conversationId: string) => {
  console.log(`🤖 Agent: Getting agent for conversation ID: ${conversationId}`);
  
  if (agentInstances.has(conversationId)) {
    console.log(`♻️ Agent: Reusing existing agent for conversation ID: ${conversationId}`);
    return agentInstances.get(conversationId);
  }

  console.log(`🆕 Agent: Creating new agent for conversation ID: ${conversationId}`);
  
  // Define the tools for the agent to use
  const tools = [searchNewsTavily];
  console.log(`🧰 Agent: Configured with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
  
  // Initialize the model
  console.log(`🧠 Agent: Initializing Claude 3.5 Sonnet model`);
  const model = new ChatAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-3-5-sonnet-latest"
  });

  // Initialize memory to persist state between graph runs
  console.log(`💾 Agent: Setting up memory saver for conversation persistence`);
  const checkpointer = new MemorySaver();

  // Create the agent
  console.log(`🔄 Agent: Creating React agent with LangGraph`);
  const agent = createReactAgent({
    llm: model,
    tools,
    checkpointSaver: checkpointer,
  });

  // Store the agent instance
  agentInstances.set(conversationId, agent);
  console.log(`✅ Agent: Successfully created and stored agent for conversation ID: ${conversationId}`);
  
  return agent;
};

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
    const messages = result.messages as RawMessage[] 


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
