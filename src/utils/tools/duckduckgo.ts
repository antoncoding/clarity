import { ToolParams } from "@langchain/core/tools";
import { StructuredTool } from "@langchain/core/tools";
import * as duckDuckScrape from "duck-duck-scrape";
import { z } from "zod";

// Re-export types from duck-duck-scrape
export type { SearchOptions } from "duck-duck-scrape";
export { SafeSearchType, SearchTimeType } from "duck-duck-scrape";

const DEFAULT_MAX_RESULTS = 10;

/**
 * Interface defining the parameters for the CustomDuckDuckGoSearch class
 */
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

/**
 * Class for performing web searches using DuckDuckGo
 */
export class CustomDuckDuckGoSearch extends StructuredTool {
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

  schema = z.object({
    query: z.string().describe("The search query string")
  });

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const { query } = input;
      
      // Properly access the search function through the duckDuckGo property
      const searchResults = await duckDuckScrape.search(query, this.searchOptions);
      
      return JSON.stringify(
        searchResults.results
          .map((result: any) => ({
            title: result.title,
            link: result.url,
            snippet: result.description,
          }))
          .slice(0, this.maxResults)
      );
    } catch (error) {
      console.error("Error with DuckDuckGo search:", error);
      return "[]"; // Return empty results on error
    }
  }
}