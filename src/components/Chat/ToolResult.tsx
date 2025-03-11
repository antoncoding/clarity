import { useState } from "react";

interface ToolResultProps {
  content: string;
  metadata: any;
}

export function ToolResult({ content, metadata }: ToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Try to parse the content as JSON
  let parsedContent: any = null;
  let isValidJson = false;
  
  try {
    parsedContent = JSON.parse(content);
    isValidJson = true;
  } catch {
    // Not valid JSON, will display as plain text
  }

  return (
    <div className="mt-1 border-l-2 border-gray-300 dark:border-gray-700 pl-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
      >
        <span>
          {isExpanded ? "Hide" : "Show"} {metadata?.name || "tool"} result
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
        <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-md overflow-auto max-h-80">
          {isValidJson ? (
            <div className="json-viewer">
              {Array.isArray(parsedContent) ? (
                // Handle array of items
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
                // Handle regular object
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
          ) : (
            // Not valid JSON, display as plain text
            <pre className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{content}</pre>
          )}
        </div>
      )}
    </div>
  );
}
