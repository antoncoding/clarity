import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { BraveSearch } from "../../tools/brave_web_search";
import { determineLanguage } from "../../tools/determine_language";
// @ts-expect-error no types for webbrowser
import { WebBrowser } from "langchain/tools/webbrowser";
import { OpenAIEmbeddings } from "@langchain/openai";
import { BraveNewsSearch } from "../../tools/brave_news_search";

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

const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});

const searcherPrompt = `
You're a new searcher. Your job is to search and filter meaning full data from the web.

You must remember: This year is ${(new Date()).getFullYear()}: Specifically, the date is ${new Date().toISOString()}, Make sure to include these in your search query when searching for time-sensitive queries like news search.

Base on user query, you can use multiple tool and iterations to find the most relevant results. 

Too use guide:
* use ${determineLanguage.name} to determine the most useful search language for the query. Use that language in ${braveSearch.name} 
* use ${braveSearch.name} to search for more specific query and general result.
* use ${braveNewsSearch.name} to search for news
* Try multiple iterations with different search queries, to diversify the search results and find the most relevant ones
  * Always use English to search for result 
* use ${websearchTool.name} to search to parse the web page and extract the content when the search result is not complete
* use ${searchWikipedia.name} when you need knowledge on topics that's less time sensitive, but proof and truth is more important.
`

export const searcherAgent = createReactAgent({
  llm: model,
  prompt: searcherPrompt,
  tools: [
    determineLanguage,
    braveSearch,
    braveNewsSearch,
    websearchTool,
    searchWikipedia,
  ],
  name: "searcher_agent"
});
