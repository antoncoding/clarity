"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = "md",
  className
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Prevent body scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render anything on the server or if the modal is closed
  if (!mounted || !isOpen) return null;

  // The modal content
  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ 
        zIndex: 2147483647, // Maximum possible z-index value (2^31 - 1)
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className={cn(
          "bg-white dark:bg-gray-dark rounded-lg shadow-xl overflow-hidden transform transition-all",
          size === "sm" && "max-w-sm w-full",
          size === "md" && "max-w-md w-full",
          size === "lg" && "max-w-lg w-full",
          className
        )}
        style={{ 
          zIndex: 2147483647,
          position: 'relative'
        }}
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
  );

  // Use createPortal to render the modal outside the normal DOM hierarchy
  return createPortal(
    modalContent,
    document.body // Render directly to the body element
  );
}
