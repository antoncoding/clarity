/**
 * Enum defining all available tool names used by both frontend and backend
 */
export enum ToolName {
  GOOGLE_SEARCH = 'google_search',
  BRAVE_WEB_SEARCH = 'brave_web_search',
  BRAVE_NEWS_SEARCH = 'brave_news_search',
  NEWSDATA_SEARCH = 'newsdata_search',
  DUCKDUCKGO = 'duckduckgo',
  DETERMINE_LANGUAGE = 'determine_language',
  SEARCH = 'search'
}

/**
 * Type for the arguments passed to different tools
 */
export interface ToolArgs {
  query?: string;
  text?: string;
  userMessage?: string;
  category?: string;
  searchLanguage?: string;
  countryCode?: string;
  freshness?: string;
  lr?: string;
  num?: number;
  [key: string]: any;
}

/**
 * Interface for a tool call
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  type?: string;
  args: ToolArgs;
}

/**
 * Interface for metadata containing tool calls
 */
export interface ToolCallMetadata {
  tool_calls?: ToolCallInfo[];
  usage_metadata?: {
    input_tokens: number;
    total_tokens: number;
    output_tokens: number;
    input_token_details?: Record<string, number>;
  };
} 