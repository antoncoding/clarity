import { useState } from "react";

interface ToolHistoryProps {
  metadata: any;
}

export function ToolHistory({ metadata }: ToolHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract needed data from metadata
  const { tool_calls, usage_metadata } = metadata || {};
  
  // If there's no tool usage info, don't show anything
  if (!tool_calls || tool_calls.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 flex items-center"
      >
        <span>
          {isExpanded ? "Hide" : "Show"} tool usage ({tool_calls.length} tools used)
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
        <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-md overflow-auto max-h-60">
          <div className="mb-2 text-gray-600 dark:text-gray-400">
            <h4 className="font-medium">Tool Usage</h4>
            {tool_calls.map((tool: any, index: number) => (
              <div key={index} className="mb-3 border-l-2 border-primary-300 pl-2">
                <div className="font-medium">{tool.name}</div>
                <div className="mt-1">
                  <div className="font-medium text-gray-500 dark:text-gray-400">Input:</div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                </div>
                {usage_metadata && (
                  <div className="mt-2 text-gray-500 dark:text-gray-400 text-xs">
                    Tokens: Input: {usage_metadata.input_tokens || 'N/A'}, Output: {usage_metadata.output_tokens || 'N/A'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
