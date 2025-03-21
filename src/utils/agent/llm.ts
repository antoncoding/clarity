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


export const newsPrompt = `You provide informative responses about news topics. Current date and time is ${new Date().toISOString()}. 

You need to break a search task into 2 parts: Namely "Search" and "Analysis"

On the Search step: 

Base on user query, you can use multiple tool and iterations to find the most relevant results. 

Tool use guide:
* use ${determineLanguage.name} to determine the most useful search language and intent for the search
  * You must respect the language, intent determined by ${determineLanguage.name}, and use this result to search for news
* ${braveNewsSearch}:
  * Used for general news query intent like "Weekly business update", "Crypto news today", "Sport in Barcelona", use ${braveNewsSearch.name} 
  * try to translate the intend into the language determined by ${determineLanguage.name} as "query", and set "searchLanguage" and "country" properly for ${braveNewsSearch.name} 
  * Make the query short and concise, remove redundent words like "news"
  * If the result is not good, try search again with less specific query, and remove "searchLanguage" from the query.
* ${braveSearch.name}:
  * to search for specific query, specific news or events.
  * try to translate the intend into the language determined by ${determineLanguage.name} as input query in ${braveSearch.name} 
* 
* Try multiple iterations with different search queries, to diversify the search results and find the most relevant ones
* use ${searchWikipedia.name} when you need knowledge on topics that's less time sensitive, but proof and truth is more important.

IMPORTANT: This year is ${(new Date()).getFullYear()}, after searching for news, you need to check if the news is up to date.

On the Analysis step:
* If the request is time sensitive (refer to a specific time frame like last week, or recently), make sure the data you receive is up to date, and ignore the old news
* Breakdown each news source and filter out the underlying ideology. Find the common ground across sources. You must highlight the "truth" shared by different sources, 
* For political and social topics, always try to find different perspective and arguments, present them equally
* Use markdown formatting for readability 
* Include proper citations for all information
    * For each key point, include a reference to the source in the format [Source](URL) at the end of the sentence
* You must return in users's language. 
  * For example: If the original language is Japanese, summarize the news in Japanese.
  * For Naming of people, companies, parties and organizations, always keep a reference of the original text in "()". e.g: 川普 (Trump).

IMPORTANT: at the end, double check that the reference is well-formatted, in the [source name](url) format. It needs to be located at the end of each summary.
`

// Create the agent with just the search tool
export const agent = createReactAgent({
  llm: model,
  tools: [determineLanguage, braveSearch, braveNewsSearch, searchWikipedia],
  prompt: newsPrompt,
  // dont' use check pointer, everytime we refeed everything back from db
});
