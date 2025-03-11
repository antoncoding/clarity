"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type ConversationItemProps = {
  className?: string;
  children: ReactNode;
  isActive: boolean;
  onClick: () => void;
  isExpanded: boolean;
};

export function ConversationItem({
  className,
  children,
  isActive,
  onClick,
  isExpanded,
}: ConversationItemProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      className={cn(
        "w-full text-xs font-normal text-left transition-all duration-200 cursor-pointer",
        "rounded-md px-2 py-1.5 my-1", // Added vertical margin between items
        isActive 
          ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100" 
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
        !isExpanded && "flex justify-center items-center px-1 py-1.5",
        className
      )}
    >
      {children}
    </div>
  );
}
