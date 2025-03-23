interface ToolCallProps {
  content: string;
}

export function ToolCall({ content }: ToolCallProps) {
  // Parse the content to get tool details
  interface ToolUse {
    type: string;
    id: string;
    name: string;
    input: {
      query?: string;
      text?: string;
      category?: string;
      searchLanguage?: string;
      countryCode?: string;
      freshness?: string;
      lr?: string; // language restriction for Google search
      num?: number; // number of results for Google search
      [key: string]: any;
    };
  }
  
  let toolUses: ToolUse[] = [];
  let parsedContent: any = null;
  
  // First, safely verify and parse the content
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
      } catch (parseError) {
        console.error("Failed to parse tool call JSON:", parseError);
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
    return <pre className="text-gray-600 dark:text-gray-400 text-xs whitespace-pre-wrap font-zen text-sm">{content}</pre>;
  }

  // Use the first tool use in the array
  const toolUse = toolUses[0];
  const toolName = toolUse.name || 'unknown';
  const toolInput = toolUse.input || {};

  // Format different tool calls appropriately
  let displayText = '';
  
  switch (toolName) {
    case 'google-search':
    case 'google_search': {
      let additionalInfo = '';
      if (toolInput.lr) {
        // Extract language from language restriction code (e.g., 'lang_es' → 'Spanish')
        const langCode = toolInput.lr.replace('lang_', '');
        const languages: Record<string, string> = {
          'es': 'Spanish',
          'en': 'English',
          'fr': 'French',
          'de': 'German',
          'it': 'Italian',
          'pt': 'Portuguese',
          'zh-CN': 'Chinese (Simplified)',
          'ja': 'Japanese',
          'ko': 'Korean',
          'ru': 'Russian'
        };
        additionalInfo = ` in ${languages[langCode] || langCode}`;
      }
      displayText = `🔍 Searching Google for: "${toolInput.query || 'unknown query'}"${additionalInfo}`;
      break;
    }
    case 'brave-web-search':
    case 'brave_web_search':
    case 'brave-search':
    case 'brave_search':
      displayText = `🔍 Searching Brave for: "${toolInput.query || 'unknown query'}"`;
      break;
    case 'brave-news-search':
    case 'brave_news_search': {
      let additionalInfo = '';
      if (toolInput.countryCode) {
        additionalInfo += ` in ${toolInput.countryCode}`;
      }
      if (toolInput.searchLanguage) {
        additionalInfo += ` (${toolInput.searchLanguage})`;
      }
      displayText = `📰 Searching Brave News for: "${toolInput.query || 'unknown query'}"${additionalInfo}`;
      break;
    }
    case 'newsdata-search':
    case 'newsdata_search': {
      const additionalInfo = toolInput.category ? ` in ${toolInput.category} category` : '';
      displayText = `📰 Searching News for: "${toolInput.query || 'unknown query'}"${additionalInfo}`;
      break;
    }
    case 'duckduckgo-search':
    case 'duckduckgo_search':
    case 'duckduckgo':
      displayText = `🔍 Searching DuckDuckGo for: "${toolInput.query || 'unknown query'}"`;
      break;
    case 'determine-language':
    case 'determine_language':
      const textPreview = toolInput.text || '';
      displayText = `🌐 Detecting language of: "${textPreview.substring(0, 50)}${textPreview.length > 50 ? '...' : ''}"`;
      break;
    default:
      // For unknown tools, show a generic message with the tool name
      displayText = `Using ${toolName} tool`;
  }

  return (
    <div className="text-gray-800 dark:text-gray-200 text-xs font-normal">
      {displayText}
    </div>
  );
} 