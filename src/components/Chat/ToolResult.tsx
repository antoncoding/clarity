import { useState } from "react";
import { SearchResultItem, SearchResultsList } from "./SearchResult";

interface ToolResultProps {
  content: string;
  metadata: any;
}

// Component to display a preview of web search results with favicons
function WebResultsPreview({ results }: { results: SearchResultItem[] }) {
  const resultCount = results.length;
  // Only show up to 3 favicons in the preview
  const previewItems = results.slice(0, 3);
  
  return (
    <div className="flex items-center">
      <span className="mr-2">Search {resultCount} web sources:</span>
      <div className="flex -space-x-1">
        {previewItems.map((result, idx) => {
          const url = 'link' in result ? result.link : result.url;
          const domain = new URL(url).hostname;
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
          
          return (
            <div 
              key={idx} 
              className="w-5 h-5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden"
            >
              <img 
                src={faviconUrl} 
                alt={domain}
                className="w-4 h-4"
                onError={(e) => {
                  // Fallback if favicon fails to load - show first letter of domain
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.textContent = domain.charAt(0).toUpperCase();
                }}
              />
            </div>
          );
        })}
        {resultCount > 3 && (
          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs">
            +{resultCount - 3}
          </div>
        )}
      </div>
    </div>
  );
}

// Component to display JSON content in a structured way
function JsonViewer({ content }: { content: any }) {
  if (Array.isArray(content)) {
    return (
      <div>
        {content.map((item, index) => (
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
            {index < content.length - 1 && <hr className="my-2 border-gray-300 dark:border-gray-700" />}
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div>
      {Object.entries(content).map(([key, value]) => (
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
    </div>
  );
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
  
  // Parse and validate content
  const { parsedContent, isSearchResults, isValidJson } = parseToolContent(content);

  // Render the appropriate content based on its type
  const renderContent = () => {
    if (!isValidJson) {
      return <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{content}</pre>;
    }

    if (isSearchResults) {
      return <SearchResultsList results={parsedContent} />;
    }

    return <JsonViewer content={parsedContent} />;
  };

  return (
    <div className="relative mt-1 border-l-2 border-gray-300 dark:border-gray-700 pl-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
      >
        {isSearchResults ? (
          <WebResultsPreview results={parsedContent} />
        ) : (
          <span>
            {isExpanded ? "Hide" : "Show"} {metadata?.name || "tool"} result
          </span>
        )}
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

// Helper function to parse and validate tool content
function parseToolContent(content: string) {
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
  
  return { parsedContent, isSearchResults, isValidJson };
}
