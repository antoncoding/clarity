import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { determineLanguage } from "../tools/determine_language";
import { BraveSearch } from "../tools/brave_web_search";
import { BraveNewsSearch } from "../tools/brave_news_search";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";

const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});


const braveSearch = new BraveSearch({
  apiKey: process.env.BRAVE_SEARCH_API_KEY,
});

const braveNewsSearch = new BraveNewsSearch({
  apiKey: process.env.BRAVE_SEARCH_API_KEY,
});

const searchWikipedia = new WikipediaQueryRun({
    topKResults: 5,
    maxDocContentLength: 4000,
});


export const newsPrompt = `You provide informative responses about news topics. Current date and time is ${new Date().toISOString()}, or in another form ${new Date().toLocaleString()}. 

You need to break a search task into 2 parts: Namely "Search" and "Analysis"

On the Search step: 

IMPORTANT: This year is ${(new Date()).getFullYear()}.
Base on user query, you can use multiple tool and iterations to find the most relevant results. 

Too use guide:
* use ${determineLanguage.name} to determine the most useful search language for the query. Use that language in ${braveSearch.name} 
* use ${braveSearch.name} to search for more specific query and general result.
* use ${braveNewsSearch.name} to search for news
* Try multiple iterations with different search queries, to diversify the search results and find the most relevant ones
  * Always use English to search for result 
* use ${searchWikipedia.name} when you need knowledge on topics that's less time sensitive, but proof and truth is more important.

On the Analysis step: Try to
* If the request is time sensitive (refer to a specific time frame like last week, or recently), make sure the data you receive is up to date, and ignore the old news
* Breakdown each news source and filter out the underlying ideology. Find the common ground across sources. You must highlight  the "truth" shared by different sources, clearly separate them from "arguments" that are only provided by each side.
* Use markdown formatting for readability
* Include proper citations for all information
* - For each key point, include a reference to the source in the format [Source](URL)
* - Organize the content with clear headings and structure

Return in users's language (make sure you differentiate 簡體中文 and 繁體中文), 
`

// Create the agent with just the search tool
export const agent = createReactAgent({
  llm: model,
  tools: [determineLanguage, braveSearch, braveNewsSearch, searchWikipedia],
  prompt: newsPrompt,
  // dont' use check pointer, everytime we refeed everything back from db
});
