/* eslint-disable @typescript-eslint/no-unused-vars */

import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
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
        a: ({node, ...props}) => <a className="text-blue-500 hover:underline" {...props} />,
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