interface LinkResult {
  title: string;
  url: string;
  content?: string;
}

interface LinkResultsProps {
  results: LinkResult[];
}

export function LinkResults({ results }: LinkResultsProps) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-gray-600 dark:text-gray-300">Search Results:</div>
      {results.map((result, idx) => (
        <a
          key={idx}
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="font-medium text-primary-600 dark:text-primary-400">
            {result.title}
          </div>
          {result.content && (
            <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              {result.content}
            </div>
          )}
        </a>
      ))}
    </div>
  );
} 