import { OpenAIEmbeddings } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { CustomDuckDuckGoSearch } from "../tools/duckduckgo";
import { BraveSearch } from "@langchain/community/tools/brave_search";
import { determineLanguage } from "../tools/determine_language";
// @ts-expect-error no types for webbrowser
import { WebBrowser } from "langchain/tools/webbrowser";

const isLocalhost = process.env.SITE_URL?.includes('localhost')

const websearchModal = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});

const embeddings = new OpenAIEmbeddings();

const braveSearch = new BraveSearch({
  apiKey: process.env.BRAVE_SEARCH_API_KEY,
});

const websearchTool = new WebBrowser({
    model: websearchModal,
    embeddings
});

const searchWikipedia = new WikipediaQueryRun({
    topKResults: 5,
    maxDocContentLength: 4000,
});
const searchDuckDuckGo = new CustomDuckDuckGoSearch({ maxResults: 5 });


const mainSearchToUse = isLocalhost ? searchDuckDuckGo : braveSearch;
export const mainSearchToolName = isLocalhost ? "DuckDuckGoSearch" : "BraveSearch";

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
    const tools = [searchWikipedia, websearchTool, mainSearchToUse, determineLanguage];
    console.log(`🧰 Agent: Configured with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
    
    // Initialize the model
    console.log(`🧠 Agent: Initializing Claude 3.5 Haiku model`);
    const model = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-5-haiku-latest"
    });
  
    // Initialize memory to persist state between graph runs
    console.log(`💾 Agent: Setting up memory saver for conversation persistence`);
  
    // Create the agent
    console.log(`🔄 Agent: Creating React agent with LangGraph`);
    const agent = createReactAgent({
      llm: model,
      tools,
      // dont' use check pointer, everytime we refeed everything back from db
    });
  
    // Store the agent instance
    agentInstances.set(conversationId, agent);
    console.log(`✅ Agent: Successfully created and stored agent for conversation ID: ${conversationId}`);
    
    return agent;
  };