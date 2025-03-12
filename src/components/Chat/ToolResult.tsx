import { useState } from "react";
import { SearchResultItem, SearchResultsList } from "./SearchResult";

interface ToolResultProps {
  content: string;
  metadata: any;
}

function isSearchResult(item: any): item is SearchResultItem {
  if (!item || typeof item !== 'object') return false;
  
  // Check for DuckDuckGo result
  if ('link' in item && 'snippet' in item) {
    return typeof item.title === 'string' && 
           typeof item.link === 'string' && 
           typeof item.snippet === 'string';
  }
  
  // Check for Tavily result
  if ('url' in item && 'content' in item) {
    return typeof item.title === 'string' && 
           typeof item.url === 'string' && 
           typeof item.content === 'string';
  }
  
  return false;
}

export function ToolResult({ content, metadata }: ToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  let parsedContent: any = null;
  let isSearchResults = false;
  let isValidJson = false;
  
  try {
    parsedContent = JSON.parse(content);
    isValidJson = true;
    // Check if content is an array of search results
    isSearchResults = Array.isArray(parsedContent) && 
      parsedContent.length > 0 && 
      parsedContent.every(isSearchResult);
  } catch {
    // Not valid JSON, will display as plain text
  }

  const renderContent = () => {
    if (!isValidJson) {
      return <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{content}</pre>;
    }

    if (isSearchResults) {
      return <SearchResultsList results={parsedContent} />;
    }

    // Regular JSON viewer
    return (
      <div>
        {Array.isArray(parsedContent) ? (
          parsedContent.map((item, index) => (
            <div key={index} className="mb-3">
              {Object.entries(item).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="font-medium text-primary-600 dark:text-primary-400">{key}:</span>{" "}
                  <span className="text-gray-800 dark:text-gray-200">
                    {typeof value === 'object' 
                      ? JSON.stringify(value, null, 2) 
                      : String(value)
                    }
                  </span>
                </div>
              ))}
              {index < parsedContent.length - 1 && <hr className="my-2 border-gray-300 dark:border-gray-700" />}
            </div>
          ))
        ) : (
          Object.entries(parsedContent).map(([key, value]) => (
            <div key={key} className="mb-1">
              <span className="font-medium text-primary-600 dark:text-primary-400">{key}:</span>{" "}
              <span className="text-gray-800 dark:text-gray-200">
                {typeof value === 'object' 
                  ? JSON.stringify(value, null, 2) 
                  : String(value)
                }
              </span>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="relative mt-1 border-l-2 border-gray-300 dark:border-gray-700 pl-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
      >
        <span>
          {isExpanded ? "Hide" : "Show"} {isSearchResults ? "search results" : `${metadata?.name || "tool"} result`}
        </span>
        <svg
          className={`ml-1 h-4 w-4 transform transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="relative z-10 mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-md overflow-auto max-h-80">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
