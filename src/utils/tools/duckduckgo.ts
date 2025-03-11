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
    return "CustomDuckDuckGoSearch";
  }

  name = "custom-duckduckgo-search";

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
      throw new Error(`Failed to search DuckDuckGo: ${error?.message}`);
    }
  }
}