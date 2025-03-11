"use client";

import { Fragment, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = "md" 
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Fragment>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        {/* Modal Content */}
        <div 
          className={cn(
            "bg-white dark:bg-gray-dark rounded-lg shadow-xl overflow-hidden transform transition-all",
            size === "sm" && "max-w-sm w-full",
            size === "md" && "max-w-md w-full",
            size === "lg" && "max-w-lg w-full"
          )}
        >
          {/* Modal Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Modal Body */}
          <div className="px-4 py-3">
            {children}
          </div>
          
          {/* Modal Footer */}
          {footer && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end space-x-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
