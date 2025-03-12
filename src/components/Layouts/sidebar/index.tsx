"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { Authentication } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { createClient } from "@/utils/supabase/client";
import { ConversationsList } from "./conversations"; 

// Define the item type to fix TypeScript errors
type NavItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url?: string;
  items: Array<{ title: string; url: string }>;
  showConversations?: boolean; 
};

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDarkMode(!isDarkMode);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/sign-in';
  };

  const handleSidebarClick = () => {
    if (!isOpen && !isMobile) {
      toggleSidebar();
    }
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "overflow-hidden border-r border-gray-200 bg-white transition-all duration-300 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? "w-[250px]" : "w-[80px] cursor-pointer",
        )}
        aria-label="Main navigation"
        onClick={!isOpen && !isMobile ? handleSidebarClick : undefined}
      >
        <div className="flex h-full flex-col py-4 pl-3 pr-2">
          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <Link
                href={"/"}
                onClick={() => isMobile && toggleSidebar()}
                className="flex items-center justify-center"
              >
                <Logo compact={false} />
              </Link>
            ) : (
              <div className="flex items-center justify-center py-2">
                <Logo compact={true} />
              </div>
            )}
            
            {isMobile && isOpen && (
              <button
                onClick={toggleSidebar}
                className="absolute right-0 top-0 p-1 text-gray-500"
                aria-label="Close sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {!isMobile && isOpen && (
              <button
                onClick={toggleSidebar}
                className="absolute -right-1 top-0 p-1 text-primary-500 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-100"
                aria-label="Collapse sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-2">
            {NAV_DATA.map((section) => (
              <div key={section.label} className="mb-4">
                {isOpen && (
                  <h2 className="mb-2 text-xs font-medium text-primary-700 dark:text-primary-300">
                    {section.label}
                  </h2>
                )}

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-1">
                    {section.items.map((item: NavItem) => {
                      const href = item.url || "/" + item.title.toLowerCase().split(" ").join("-");
                        
                      return (
                        <li key={item.title}>
                          <MenuItem
                            className={cn(
                              "flex items-center gap-3 py-3 text-sm",
                              !isOpen && "justify-center px-0"
                            )}
                            as="link"
                            href={href}
                            isActive={pathname === href}
                          >
                            <item.icon
                              className="size-5 shrink-0 text-primary-600 dark:text-primary-300"
                              aria-hidden="true"
                            />

                            {isOpen && <span className="text-sm">{item.title}</span>}
                          </MenuItem>
                          
                          {isOpen && item.showConversations && (
                            <ConversationsList 
                              isExpanded={isOpen}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
          
          <div className="mt-auto border-t border-gray-200 pt-3 dark:border-gray-800">
            <button 
              className={cn(
                "mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30",
                !isOpen && "justify-center px-0"
              )}
              onClick={toggleDarkMode}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary-500 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary-500 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {isOpen && <span className="text-bold text-gray-700 dark:text-gray-300">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
            </button>
            
            <button 
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-accent-600 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-900/30",
                !isOpen && "justify-center px-0"
              )}
              onClick={handleSignOut}
            >
              <Authentication className="size-5" />
              {isOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
