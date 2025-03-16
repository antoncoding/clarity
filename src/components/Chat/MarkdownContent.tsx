/* eslint-disable @typescript-eslint/no-unused-vars */

import ReactMarkdown from "react-markdown";
import { useMemo } from "react";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  // Function to extract domain from URL
  const getDomain = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch (e) {
      return "link";
    }
  };

  // Function to get favicon
  const getFaviconUrl = (url: string) => {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  return (
    <ReactMarkdown
      components={{
        strong: ({node, ...props}) => <span className="font-medium text-current" {...props} />,
        ul: ({node, ...props}) => <ul className="list-none pl-3 space-y-1" {...props} />,
        li: ({node, children, ...props}) => (
          <li className="relative pl-4 before:content-['-'] before:absolute before:left-0 before:text-gray-500 before:dark:text-gray-400" {...props}>
            {children}
          </li>
        ),
        p: ({node, ...props}) => <p className="my-1 leading-normal" {...props} />,
        h1: ({node, ...props}) => <h1 className="text-xl font-normal my-2" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-lg font-normal my-1.5" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-base font-normal my-1" {...props} />,
        a: ({node, href, children, ...props}) => {
          if (!href) return <a className="text-blue-500 hover:underline" {...props}>{children}</a>;
          
          const domain = getDomain(href);
          const faviconUrl = getFaviconUrl(href);
          
          return (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center group relative"
              {...props}
            >
              <span className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5 text-xs">
                <img src={faviconUrl} alt={domain} className="w-4 h-4 mr-1" />
                <span>{domain}</span>
              </span>
              <span className="absolute bottom-full mb-1 left-0 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity w-max max-w-xs overflow-hidden text-ellipsis">
                {children}
              </span>
            </a>
          );
        },
        code: ({node, className, children, ...props}: any) => (
          <code className="font-mono text-sm bg-transparent px-1 py-0.5 text-primary-700 dark:text-primary-300 font-light" {...props}>
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
} 