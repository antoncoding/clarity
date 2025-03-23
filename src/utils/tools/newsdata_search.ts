import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Array of valid categories supported by NewsData.io API.
 */
export const VALID_CATEGORIES = [
  "top", "business", "entertainment", "health", "politics", "science", "sports", "technology", "tourism", "world", "domestic"
];

/**
 * Interface for the parameters required to instantiate a NewsDataSearch
 * instance.
 */
export interface NewsDataSearchParams {
  apiKey?: string;
}

/**
 * Sanitizes the query string to handle special characters that might cause issues with the API.
 * @param query The search query string to sanitize
 * @returns A sanitized version of the query
 */
function sanitizeQuery(query: string): string {
  // Step 1: Normalize accented characters to their ASCII equivalents if possible
  // This uses Unicode normalization form D (NFD) to separate base characters from accents,
  // then removes the accents, and finally converts back to normal form C (NFC)
  const normalized = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .normalize('NFC');
  
  // Step 2: Replace any problematic characters with spaces
  // This pattern targets various special characters that might cause issues
  const sanitized = normalized.replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, ' ').trim();
  
  return sanitized;
}

/**
 * Class for interacting with the NewsData.io API. It extends the StructuredTool
 * class and requires an API key to function.
 */
export class NewsDataSearch extends StructuredTool {
  static lc_name() {
    return "NewsDataSearch";
  }

  name = "newsdata-search";
  
  description = "Search for recent news articles using NewsData.io API";

  schema = this.createInputSchema();

  apiKey: string;

  constructor(
    fields: NewsDataSearchParams = {
      apiKey: getEnvironmentVariable("NEWSDATA_API_KEY"),
    }
  ) {
    super();

    if (!fields.apiKey) {
      throw new Error(
        `NewsData API key not set. Please pass it in or set it as an environment variable named "NEWSDATA_API_KEY".`
      );
    }

    this.apiKey = fields.apiKey;
    console.log(`📡 NewsDataSearch initialized with API key: ${this.apiKey.substring(0, 5)}...`);
  }

  /**
   * Creates a Zod schema for validating the input parameters.
   * @returns A Zod schema for the input object.
   */
  protected createInputSchema() {
    return z.object({
      query: z.string().describe("The search query for finding news articles"),
      category: z.enum(VALID_CATEGORIES as [string, ...string[]])
        .optional()
        .describe("The category of news to focus on"),
    });
  }

  /** @ignore */
  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { query, category } = input;
    
    // Sanitize the query to handle special characters
    const sanitizedQuery = sanitizeQuery(query);
    
    // Log original and sanitized queries for debugging
    console.log(`🔍 NewsData Search Request - Original Query: "${query}", Sanitized: "${sanitizedQuery}", Category: ${category ?? 'All'}`);

    try {
      const url = new URL("https://newsdata.io/api/1/news");
      
      // Add required parameters (using sanitized query)
      url.searchParams.append("apikey", this.apiKey);
      url.searchParams.append("q", sanitizedQuery);
      
      // Add optional parameters
      if (category) url.searchParams.append("category", category);
      
      // Set the size to 10
      url.searchParams.append("size", "10");

      console.log(`📤 NewsData API Request: ${url.toString().replace(this.apiKey, 'API_KEY_HIDDEN')}`);

      // Handle empty query after sanitization
      if (!sanitizedQuery.trim()) {
        console.log(`⚠️ Query is empty after sanitization. Using fallback query.`);
        url.searchParams.set("q", "news");
      }

      const response = await fetch(url.toString());
      
      console.log(`📥 NewsData API Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ NewsData API Error: HTTP ${response.status} - ${errorText}`);
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      console.log(`📊 NewsData API Response: Status=${data.status}, TotalResults=${data.totalResults || 0}`);
      
      // Check API response status
      if (data.status !== "success") {
        const errorMessage = data.results?.message || "Unknown error from NewsData API";
        console.error(`❌ NewsData API Error: ${errorMessage}`, data);
        throw new Error(`NewsData API error: ${errorMessage}`);
      }
      
      // Return empty array if no results
      if (!data.results || !Array.isArray(data.results)) {
        console.log(`ℹ️ NewsData API: No results found for query "${sanitizedQuery}"`);
        return JSON.stringify([]);
      }

      console.log(`✅ NewsData API: Found ${data.results.length} results for query "${sanitizedQuery}"`);
      
      // Map to exactly match the Google Search format (title, link, snippet)
      const finalResults = data.results.map((item: any) => {
        return {
          title: item.title || "",
          link: item.link || "",
          snippet: item.description || ""
        }
      });

      // Log a sample result (first item)
      if (finalResults.length > 0) {
        console.log(`📰 Sample result: ${JSON.stringify(finalResults[0])}`);
      }

      return JSON.stringify(finalResults);
    } catch (error) {
      console.error(`❌ NewsData Search Error:`, error);
      throw error;
    }
  }
} 