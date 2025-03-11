import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Define a news search tool
const searchNews = tool(async ({ query }) => {
  console.log(`🔍 Tool: search_news - Searching for news about: "${query}"`);
  
  // This is a placeholder implementation
  // In a real application, you would call an actual news API here
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`📰 Tool: search_news - Found news results for: "${query}"`);
  
  return JSON.stringify({
    articles: [
      {
        title: `Latest news about ${query}`,
        description: `This is a simulated news article about ${query}.`,
        source: "News API",
        url: "https://example.com/news/1",
        publishedAt: new Date().toISOString()
      },
      {
        title: `More information on ${query}`,
        description: `Additional details related to ${query} from trusted sources.`,
        source: "News API",
        url: "https://example.com/news/2",
        publishedAt: new Date().toISOString()
      }
    ]
  });
}, {
  name: "search_news",
  description: "Search for recent news articles on a specific topic or query.",
  schema: z.object({
    query: z.string().describe("The news topic or keywords to search for."),
  }),
});

// Define a summarize tool
const summarizeArticle = tool(async ({ url, maxLength }) => {
  console.log(`📝 Tool: summarize_article - Summarizing article at: "${url}" with max length: ${maxLength || 'default'}`);
  
  // This is a placeholder implementation
  // In a real application, you would fetch and summarize the actual article
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log(`✅ Tool: summarize_article - Completed summary for: "${url}"`);
  
  return `This is a simulated summary of the article at ${url}. The summary is limited to approximately ${maxLength} words as requested. The article discusses key points related to the topic with insights from experts in the field.`;
}, {
  name: "summarize_article",
  description: "Fetch and summarize a news article from a given URL.",
  schema: z.object({
    url: z.string().describe("The URL of the news article to summarize."),
    maxLength: z.number().optional().describe("Maximum length of the summary in words."),
  }),
});

// Create a map of thread IDs to agent instances
const agentInstances = new Map();

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
  const tools = [searchNews, summarizeArticle];
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
    
    const agent = getAgent(conversationId);
    
    // Invoke the agent with the user message
    console.log(`🚀 Agent: Invoking agent with message`);
    const result = await agent.invoke(
      {
        messages: [{
          role: "user",
          content: message
        }]
      },
      { configurable: { thread_id: conversationId } }
    );
    
    console.log(`✅ Agent: Agent processing complete`);
    const response = result.messages.at(-1)?.content || "Sorry, I couldn't process your request.";
    console.log(`📊 Agent: Response length: ${response.length} characters`);
    console.log(`💬 Agent: Response preview: "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`);
    
    // Return the agent's response
    return response;
  } catch (error) {
    console.error(`❌ Agent: Error processing message:`, error);
    return "I encountered an error while processing your request. Please try again.";
  }
};
