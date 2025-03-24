import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolName } from "../toolNames";

/**
 * Interface for the parameters required to instantiate a BraveSearch
 * instance.
 */
export interface BraveSearchParams {
  apiKey?: string;
}

/**
 * Class for interacting with the Brave Search engine. It extends the StructuredTool
 * class and requires an API key to function. The API key can be passed in
 * during instantiation or set as an environment variable named
 * 'BRAVE_SEARCH_API_KEY'.
 */
export class BraveSearch extends StructuredTool {
  static lc_name() {
    return "BraveSearch";
  }

  name = ToolName.BRAVE_WEB_SEARCH;

  description =
    "a search engine. useful for when you need to answer questions about current events. input should be a search query.";

  schema = z.object({
    query: z.string().describe("The search query string")
  });

  apiKey: string;

  constructor(
    fields: BraveSearchParams = {
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

  /** @ignore */
  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { query } = input;
    
    const headers = {
      "X-Subscription-Token": this.apiKey,
      Accept: "application/json",
    };
    const searchUrl = new URL(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        query
      )}`
    );

    console.log(`🔍 Brave Simple Web Search: ${query}`);

    const response = await fetch(searchUrl, { headers });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const parsedResponse = await response.json();
    const webSearchResults = parsedResponse.web?.results;
    const finalResults = Array.isArray(webSearchResults)
      ? webSearchResults.map(
          (item: { title?: string; url?: string; description?: string }) => ({
            title: item.title,
            link: item.url,
            snippet: item.description,
          })
        )
      : [];
    return JSON.stringify(finalResults);
  }
}