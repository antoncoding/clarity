import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Interface for the parameters required to instantiate a GoogleSearch
 * instance.
 */
export interface GoogleSearchParams {
  apiKey?: string;
  cseId?: string;
}

/**
 * Class for interacting with the Google Custom Search API. It extends the StructuredTool
 * class and requires an API key and Custom Search Engine ID to function.
 */
export class GoogleSearch extends StructuredTool {
  static lc_name() {
    return "GoogleSearch";
  }

  name = "google-search";
  
  description = "Search for information and news using Google Search Engine";

  schema = this.createInputSchema();

  apiKey: string;
  cseId: string;

  constructor(
    fields: GoogleSearchParams = {
      apiKey: getEnvironmentVariable("GOOGLE_SEARCH_API_KEY"),
      cseId: getEnvironmentVariable("GOOGLE_SEARCH_CSE_ID"),
    }
  ) {
    super();

    if (!fields.apiKey) {
      throw new Error(
        `Google API key not set. Please pass it in or set it as an environment variable named "GOOGLE_SEARCH_API_KEY".`
      );
    }

    if (!fields.cseId) {
      throw new Error(
        `Google Custom Search Engine ID not set. Please pass it in or set it as an environment variable named "GOOGLE_SEARCH_CSE_ID".`
      );
    }

    this.apiKey = fields.apiKey;
    this.cseId = fields.cseId;
  }

  /**
   * Creates a Zod schema for validating the input parameters.
   * @returns A Zod schema for the input object.
   */
  protected createInputSchema() {
    return z.object({
      query: z.string().describe("The search query for finding information"),
      safeSearch: z.enum(["off", "medium", "high"]).optional().describe("Safety level for the search"),
      lr: z.string().optional().describe("Language restriction. e.g., 'lang_en' for English"),
      dateRestrict: z.string().optional().describe("Date restriction in format [dN, wN, mN, yN] where N is a number. e.g., 'd7' for last 7 days")
    });
  }

  /** @ignore */
  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { query, safeSearch, lr, dateRestrict } = input;

    console.log(`🔍 Google Search Input: ${query}`);

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    
    // Add required parameters
    url.searchParams.append("key", this.apiKey);
    url.searchParams.append("cx", this.cseId);
    url.searchParams.append("q", query);
    url.searchParams.append("num", "10");
    
    // Add optional parameters
    if (safeSearch) url.searchParams.append("safe", safeSearch);
    if (lr) url.searchParams.append("lr", lr);
    if (dateRestrict) url.searchParams.append("dateRestrict", dateRestrict);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    
    // Return empty array if no results
    if (!data.items || !Array.isArray(data.items)) {
      return JSON.stringify([]);
    }

    // Map to match the exact format from brave_web_search.ts
    const finalResults = data.items.map((item: any) => {

      return {
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      }
    });

    return JSON.stringify(finalResults);
  }
} 