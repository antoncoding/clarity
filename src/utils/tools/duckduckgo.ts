import { Tool, ToolParams } from "@langchain/core/tools";
import * as duckDuckScrape from "duck-duck-scrape";

// Re-export types from duck-duck-scrape
export type { SearchOptions } from "duck-duck-scrape";
export { SafeSearchType, SearchTimeType } from "duck-duck-scrape";

export interface CustomDuckDuckGoSearchParameters extends ToolParams {
  /**
   * The search options for DuckDuckGo search
   */
  searchOptions?: duckDuckScrape.SearchOptions;
  /**
   * Maximum number of results to return
   * @default 10
   */
  maxResults?: number;
}

const DEFAULT_MAX_RESULTS = 10;

/**
 * Custom DuckDuckGo search tool that properly handles the duck-duck-scrape API
 */
export class CustomDuckDuckGoSearch extends Tool {
  private searchOptions?: duckDuckScrape.SearchOptions;
  private maxResults = DEFAULT_MAX_RESULTS;

  constructor(params?: CustomDuckDuckGoSearchParameters) {
    super(params ?? {});

    const { searchOptions, maxResults } = params ?? {};
    this.searchOptions = searchOptions;
    this.maxResults = maxResults || this.maxResults;
  }

  static lc_name() {
    return "DuckDuckGoSearch";
  }

  name = "duckduckgo-search";

  description =
    "A search engine. Useful for when you need to answer questions about current events. Input should be a search query.";

  async _call(input: string): Promise<string> {
    try {
      // Properly access the search function through the duckDuckGo property
      const searchResults = await duckDuckScrape.search(input, this.searchOptions);
      
      return JSON.stringify(
        searchResults.results
          .map((result) => ({
            title: result.title,
            link: result.url,
            snippet: result.description,
          }))
          .slice(0, this.maxResults)
      );
    } catch (error: any) { 
      console.error("Error performing DuckDuckGo search:", error);
      
      // Return a friendly message instead of throwing
      const errorMessage = error?.message || "Unknown error";
      const isRateLimited = errorMessage.includes("detected an anomaly") || 
                            errorMessage.includes("too quickly");
      
      if (isRateLimited) {
        return JSON.stringify({
          error: true,
          message: "DuckDuckGo search rate limited. Try using a different search strategy or tool.",
          suggestion: "Consider using Wikipedia, WebBrowser, or try a different search query."
        });
      } else {
        return JSON.stringify({
          error: true,
          message: `DuckDuckGo search failed: ${errorMessage}`,
          suggestion: "Try using a different search tool or reformulate your query."
        });
      }
    }
  }
}