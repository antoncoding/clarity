import { ToolName, ToolArgs, ToolCallInfo, ToolCallMetadata } from '@/utils/toolNames';

// Simplified enum with only canonical tool types
export enum ToolType {
  GOOGLE_SEARCH = 'google-search',
  BRAVE_WEB_SEARCH = 'brave-web-search',
  BRAVE_NEWS_SEARCH = 'brave-news-search',
  NEWSDATA_SEARCH = 'newsdata-search',
  DUCKDUCKGO_SEARCH = 'duckduckgo-search',
  DETERMINE_LANGUAGE = 'determine-language'
}

interface ToolUse {
  type: string;
  id: string;
  name: string;
  input: ToolArgs;
}

interface ToolCallProps {
  content: string;
  metadata?: ToolCallMetadata;
}

// Helper function to format tool call display text
function formatToolCallDisplay(toolName: string, toolInput: ToolArgs): string {
  switch (toolName) {
    case ToolName.GOOGLE_SEARCH: {
      let additionalInfo = '';
      if (toolInput.lr) {
        // Extract language from language restriction code (e.g., 'lang_es' → 'Spanish')
        const langCode = toolInput.lr.replace('lang_', '');
        additionalInfo = ` in ${langCode}`;
      }
      return `🔍 Searching Google for: "${toolInput.query || 'unknown query'}"${additionalInfo}`;
    }
    
    case ToolName.BRAVE_WEB_SEARCH:
      return `🔍 Searching Brave for: "${toolInput.query || 'unknown query'}"`;
    
    case ToolName.BRAVE_NEWS_SEARCH: {
      let additionalInfo = '';
      if (toolInput.countryCode) {
        additionalInfo += ` in ${toolInput.countryCode}`;
      }
      if (toolInput.searchLanguage) {
        additionalInfo += ` (${toolInput.searchLanguage})`;
      }
      return `📰 Searching Brave News for: "${toolInput.query || 'unknown query'}"${additionalInfo}`;
    }
    
    case ToolName.NEWSDATA_SEARCH: {
      const additionalInfo = toolInput.category ? ` in ${toolInput.category} category` : '';
      return `📰 Searching News for: "${toolInput.query || 'unknown query'}"${additionalInfo}`;
    }
    
    case ToolName.DUCKDUCKGO:
      return `🔍 Searching DuckDuckGo for: "${toolInput.query || 'unknown query'}"`;
    
    case ToolName.DETERMINE_LANGUAGE: {
      const textPreview = toolInput.userMessage || toolInput.text || '';
      return `🌐 Detecting language for: "${textPreview.substring(0, 50)}${textPreview.length > 50 ? '...' : ''}"`;
    }
    
    case ToolName.SEARCH:
      return `🔍 Performing search for: "${toolInput.query || 'unknown query'}"`;
    
    default:
      // For unknown tools, show a generic message with the tool name
      return `Using ${toolName} tool`;
  }
}

export function ToolCall({ content, metadata }: ToolCallProps) {
  // First check if we have tool_calls in metadata
  const metadataToolCalls = metadata?.tool_calls as ToolCallInfo[] | undefined;
  
  // If we have metadata tool calls, use those instead of parsing content
  if (metadataToolCalls && metadataToolCalls.length > 0) {
    const toolCall = metadataToolCalls[0]; // Use first tool call for now
    const toolName = toolCall.name;
    const toolArgs = toolCall.args;
    
    const displayText = formatToolCallDisplay(toolName, toolArgs);
    
    return (
      <div>
        {/* Display the message content if it exists */}
        {content && (
          <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )}
        
        {/* Display the formatted tool call */}
        <div className="text-xs font-medium text-primary-600 dark:text-primary-400 mt-1 flex items-center">
          <span className="inline-flex items-center rounded-md bg-primary-50 dark:bg-primary-900/30 px-2 py-1 text-xs font-medium ring-1 ring-inset ring-primary-600/20 dark:ring-primary-500/30">
            {displayText}
          </span>
        </div>
      </div>
    );
  }
  
  // Fall back to content parsing if no metadata tool calls
  let toolUses: ToolUse[] = [];
  let parsedContent: any = null;
  
  // Safely verify and parse the content
  try {
    // Handle the case when content is undefined or null
    if (!content) {
      return <div className="text-gray-600 dark:text-gray-400 text-xs">No tool call data available</div>;
    }
    
    // If it's already an object, use it directly
    if (typeof content !== 'string') {
      parsedContent = content;
    } else {
      // Check if it's a valid JSON string before parsing
      try {
        parsedContent = JSON.parse(content);
      } catch {
        return <pre className="text-gray-600 dark:text-gray-400 text-xs whitespace-pre-wrap font-zen">{content}</pre>;
      }
    }
    
    // Now safely handle the parsed content
    if (Array.isArray(parsedContent)) {
      toolUses = parsedContent;
    } else if (parsedContent && typeof parsedContent === 'object') {
      toolUses = [parsedContent];
    } else {
      // If it's not an array or object, show the raw content
      return <pre className="text-gray-600 dark:text-gray-400 text-xs whitespace-pre-wrap font-zen">{content}</pre>;
    }
  } catch (error) {
    console.error("Unexpected error processing tool call content:", error);
    return <pre className="text-gray-600 dark:text-gray-400 text-xs whitespace-pre-wrap font-zen">{String(content)}</pre>;
  }

  if (toolUses.length === 0) {
    return <pre className="text-gray-600 dark:text-gray-400 text-xs whitespace-pre-wrap font-zen">{content}</pre>;
  }

  // Use the first tool use in the array
  const toolUse = toolUses[0];
  const toolName = toolUse.name || 'unknown';
  const toolInput = toolUse.input || {};

  // Format the tool call for display
  const displayText = formatToolCallDisplay(toolName, toolInput);

  return (
    <div className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center">
      <span className="inline-flex items-center rounded-md bg-primary-50 dark:bg-primary-900/30 px-2 py-1 text-xs font-medium ring-1 ring-inset ring-primary-600/20 dark:ring-primary-500/30">
        {displayText}
      </span>
    </div>
  );
} 