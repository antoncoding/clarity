import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { CustomDuckDuckGoSearch } from "./duckduckgo";
import { BraveSearch } from "@langchain/community/tools/brave_search";
import { determineLanguage } from "./determine_language";
import { BraveNewsSearch } from "./brave_news_search";
// @ts-expect-error no types for webbrowser
import { WebBrowser } from "langchain/tools/webbrowser";
import { OpenAIEmbeddings } from "@langchain/openai";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { AIMessage } from "@langchain/core/messages";

const isLocalhost = false // process.env.SITE_URL?.includes('localhost')

const websearchModal = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});

const embeddings = new OpenAIEmbeddings();

const braveSearch = new BraveSearch({
  apiKey: process.env.BRAVE_SEARCH_API_KEY,
});

const braveNewsSearch = new BraveNewsSearch({
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
const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});

const searcherPrompt = `
You're a new searcher. Your job is to search and filter meaning full data from the web.

You must remember: This year is ${(new Date()).getFullYear()}: Specifically, the date is ${new Date().toISOString()}, Make sure to include these in your search query when searching for time-sensitive queries like news search.

Base on user query, you can use multiple tool and iterations to find the most relevant results. 

Too use guide:
* use determine_search_language to determine the most useful search language for the query. Use that language in ${mainSearchToolName} 
* use brave-news-search to search for news!
* use ${mainSearchToolName} to search for more specific, result.
* Try multiple iterations with different search queries, to diversify the search results and find the most relevant ones
  * Always use English to search for result 
* use WebBrowser to search to parse the web page and extract the content when the search result is not complete
* use Wikipedia when you need knowledge on topics that's less time sensitive, but proof and truth is more important.
`

const searcherAgent = createReactAgent({
  llm: model,
  prompt: searcherPrompt,
  tools: [
    determineLanguage,
    mainSearchToUse,
    websearchTool,
    searchWikipedia,
    braveNewsSearch,
  ],
  name: "searcher_agent"
});

export const search = tool(async ({ query }) => {
  const result = await searcherAgent.invoke({ messages: [{ role: "user", content: query }] });
  
  console.log(`🔍 Search completed for: "${query}"`);
  
  // Extract and combine usage metadata from all AI messages
  const usage_metadata = result.messages
    .filter((message) => message instanceof AIMessage)
    .map((message) => message.usage_metadata)
    .filter(Boolean) // Filter out undefined/null metadata
    .reduce((acc, metadata) => {
      if (!metadata) return acc;
      
      // Initialize accumulator if first valid metadata
      if (!acc) return { ...metadata };
      
      // Sum up all the usage metrics
      return {
        input_tokens: (acc.input_tokens || 0) + (metadata.input_tokens || 0),
        output_tokens: (acc.output_tokens || 0) + (metadata.output_tokens || 0),
        total_tokens: (acc.total_tokens || 0) + (metadata.total_tokens || 0),
        // Include any other metrics that need to be summed
      };
    }, {input_tokens: 0, output_tokens: 0, total_tokens: 0}) || {};
  
  return {
    news: result.messages.map((message) => message.content) || [],
    usage_metadata
  };
}, {
  name: "search",
  description: "Search the web for information on a given query. Returns structured news results.",
  schema: z.object({
    query: z.string().describe("The search query to look up information for"),
  }),
});