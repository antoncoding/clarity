import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolName } from "../toolNames";

/**
 * Array of valid search language codes supported by Brave News Search API.
 */
export const VALID_SEARCH_LANGUAGES = [
  "ar", "eu", "bn", "bg", "ca", "zh-hans", "zh-hant", "hr", "cs", "da",
  "nl", "en", "en-gb", "et", "fi", "fr", "gl", "de", "gu", "he",
  "hi", "hu", "is", "it", "jp", "kn", "ko", "lv", "lt", "ms",
  "ml", "mr", "nb", "pl", "pt-br", "pt-pt", "pa", "ro", "ru", "sr",
  "sk", "sl", "es", "sv", "ta", "te", "th", "tr", "uk", "vi"
];

/**
 * Array of valid country codes supported by Brave News Search API.
 */
export const VALID_COUNTRY_CODES = [
  "ALL", "AR", "AU", "AT", "BE", "BR", "CA", "CL", "DK", "FI", 
  "FR", "DE", "HK", "IN", "ID", "IT", "JP", "KR", "MY", "MX", 
  "NL", "NZ", "NO", "CN", "PL", "PT", "PH", "RU", "SA", "ZA", 
  "ES", "SE", "CH", "TW", "TR", "GB", "US"
];



/**
 * Interface for the parameters required to instantiate a BraveNewsSearch
 * instance.
 */
export interface BraveNewsSearchParams {
  apiKey?: string;
}

/**
 * Class for interacting with the Brave News Search API. It extends the StructuredTool
 * class and requires an API key to function. The API key can be passed in
 * during instantiation or set as an environment variable named
 * 'BRAVE_SEARCH_API_KEY'.
 */
export class BraveNewsSearch extends StructuredTool {
  static lc_name() {
    return "BraveNewsSearch";
  }

  name = ToolName.BRAVE_NEWS_SEARCH;
  
  description = "Search for news articles using Brave News Search API";

  schema = this.createInputSchema();

  apiKey: string;

  constructor(
    fields: BraveNewsSearchParams = {
      apiKey: getEnvironmentVariable("BRAVE_SEARCH_API_KEY"),
    }
  ) {
    super();

    if (!fields.apiKey) {
      throw new Error(
        `Brave API key not set. Please pass it in or set it as an environment variable named "BRAVE_SEARCH_API_KEY".`
      );
    }

    this.apiKey = fields.apiKey;
  }

  /**
   * Creates a Zod schema for validating the input parameters.
   * @returns A Zod schema for the input object.
   */
  protected createInputSchema() {
    return z.object({
      query: z.string().describe("The search query for finding news articles"),
      searchLanguage: z.enum(VALID_SEARCH_LANGUAGES as [string, ...string[]])
        .optional()
        .default("en")
        .describe("The language code for the search results. Defaults to English (en)."),
      countryCode: z.enum(VALID_COUNTRY_CODES as [string, ...string[]])
        .optional()
        .describe("The country code to prioritize news from. Defaults to United States (US)."),
      freshness: z.enum(["pd", "pw", "pm", "py"])
        .optional()
        .describe("Filter results by discovery time: pd (last 24h), pw (last 7 days), pm (last 31 days), py (last 365 days)")
    });
  }

  /** @ignore */
  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { query, searchLanguage, countryCode, freshness } = input;

    console.log(`🔍 Brave News Search Input: ${query}, ${searchLanguage}, ${countryCode ?? ''}, ${freshness ?? ''}`);

    const headers = {
      "X-Subscription-Token": this.apiKey,
      Accept: "application/json",
    };

    const searchUrl = new URL(
      `https://api.search.brave.com/res/v1/news/search`
    );
    
    // Add query parameters
    searchUrl.searchParams.append("q", query);
    // if (searchLanguage) searchUrl.searchParams.append("search_lang", searchLanguage);
    if (countryCode) searchUrl.searchParams.append("country", countryCode);
    if (freshness) searchUrl.searchParams.append("freshness", freshness);

    const response = await fetch(searchUrl.toString(), { headers });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const parsedResponse = await response.json();
    const newsSearchResults = parsedResponse.results;
    const finalResults = Array.isArray(newsSearchResults)
      ? newsSearchResults.map(
          (item: { title?: string; url?: string; description?: string; age?: number }) => ({
            title: item.title,
            link: item.url,
            snippet: item.description,
            age: item.age,
          })
        )
      : [];
    return JSON.stringify(finalResults);
  }
}