type DuckDuckGoResult = {
  title: string;
  link: string;
  snippet: string;
}

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
  raw_content?: string | null;
}

export type SearchResultItem = DuckDuckGoResult | TavilyResult;

interface SearchResultProps {
  result: SearchResultItem;
}

export function SearchResult({ result }: SearchResultProps) {
  // Normalize the URL and content based on result type
  const url = 'link' in result ? result.link : result.url;
  const content = 'snippet' in result ? result.snippet : result.content;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="font-medium text-primary-600 dark:text-primary-400">
        {result.title}
      </div>
      <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
        {content}
      </div>
    </a>
  );
}

interface SearchResultsListProps {
  results: SearchResultItem[];
}

export function SearchResultsList({ results }: SearchResultsListProps) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-gray-600 dark:text-gray-300">Search Results:</div>
      {results.map((result, idx) => (
        <SearchResult key={idx} result={result} />
      ))}
    </div>
  );
} 