"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { Authentication, Settings, HomeIcon } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { createClient } from "@/utils/supabase/client";
import { ConversationsList } from "./conversations"; 

// Define new component types
type NavItemProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  isActive: boolean;
  onClick?: () => void;
  subMenu?: ReactNode;
  isSidebarExpanded: boolean;
};

// NavItem component - Main navigation item
const NavItem = ({ 
  title, 
  icon: Icon, 
  href, 
  isActive, 
  onClick, 
  subMenu, 
  isSidebarExpanded 
}: NavItemProps) => {
  const [isSubMenuCollapsed, setIsSubMenuCollapsed] = useState(false);

  return (
    <li className="mb-1">
      <div className="flex items-center gap-1">
        <MenuItem
          className={cn(
            "flex-1 flex items-center gap-2 sm:gap-3 py-2 sm:py-3 text-xs sm:text-sm",
            !isSidebarExpanded && "justify-center px-0"
          )}
          isActive={isActive}
          onClick={onClick}
          href={href}
        >
          <Icon
            className="size-4 sm:size-5 shrink-0 text-primary-600 dark:text-primary-300"
            aria-hidden="true"
          />
          {isSidebarExpanded && <span className="text-xs sm:text-sm">{title}</span>}
        </MenuItem>
        
        {isSidebarExpanded && subMenu && (
          <button
            onClick={() => setIsSubMenuCollapsed(!isSubMenuCollapsed)}
            className={cn(
              "p-1.5 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30",
              "text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300",
              "transition-all duration-300"
            )}
            aria-label={isSubMenuCollapsed ? "Show conversations" : "Hide conversations"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                isSubMenuCollapsed ? "rotate-180" : ""
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      
      {isSidebarExpanded && subMenu && !isSubMenuCollapsed && (
        <div className="mt-1">{subMenu}</div>
      )}
    </li>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsOpen, isOpen: isSidebarExpanded, isMobile, toggleSidebar } = useSidebarContext();
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
    if (!isSidebarExpanded && !isMobile) {
      toggleSidebar();
    }
  };

  // Add a function to close sidebar when clicking a link on mobile
  const handleMobileLinkClick = () => {
    if (isMobile && isSidebarExpanded) {
      setIsOpen(false);
    }
  };

  // Add a function to handle conversation clicks
  const handleConversationClick = (conversationId: string) => {
    // Navigate to the specific conversation URL
    router.push(`/news/${conversationId}`);
    
    // Close sidebar on mobile if needed
    if (isMobile && isSidebarExpanded) {
      setIsOpen(false);
    }
  };

  const isNewsActive = pathname === "/" || pathname.startsWith('/news/');

  return (
    <>
      {isMobile && isSidebarExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "overflow-hidden border-r border-gray-200 bg-white transition-all duration-300 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile 
            ? "fixed bottom-0 top-0 z-50 left-0" // Ensure it's positioned at left edge
            : "sticky top-0 h-screen",
          isSidebarExpanded 
            ? "w-[320px]" 
            : isMobile 
              ? "w-0" // Hide completely when closed on mobile
              : "w-[70px] sm:w-[90px] cursor-pointer",
        )}
        aria-label="Main navigation"
        onClick={!isSidebarExpanded && !isMobile ? handleSidebarClick : undefined}
      >
        <div className="flex h-full flex-col py-3 sm:py-4 pl-2 sm:pl-3 pr-1 sm:pr-2">
          <div className="relative flex items-center justify-center">
            {isSidebarExpanded ? (
              <Link
                href={"/"}
                onClick={() => isMobile && toggleSidebar()}
                className="flex items-center justify-center"
              >
                <Logo compact={false} />
              </Link>
            ) : (
              <div className="flex items-center justify-center py-1 sm:py-2">
                <Logo compact={true} />
              </div>
            )}
            
            {isMobile && isSidebarExpanded && (
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
            
            {!isMobile && isSidebarExpanded && (
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

          <div className="custom-scrollbar mt-4 sm:mt-6 flex-1 overflow-y-auto pr-1 sm:pr-2">
            {/* Main Navigation Section */}
            <div className="mb-3 sm:mb-4">
              {isSidebarExpanded && (
                <h2 className="mb-1 sm:mb-2 text-xs font-medium text-primary-700 dark:text-primary-300">
                  MAIN
                </h2>
              )}

              <nav role="navigation" aria-label="Main Navigation">
                <ul className="space-y-1">
                  {/* News Navigation Item with Submenu */}
                  <NavItem
                    title="News"
                    icon={HomeIcon}
                    href="/"
                    isActive={isNewsActive}
                    onClick={handleMobileLinkClick}
                    isSidebarExpanded={isSidebarExpanded}
                    subMenu={
                      <ConversationsList 
                        isExpanded={isSidebarExpanded}
                        onConversationClick={handleConversationClick}
                        activePath={pathname}
                      />
                    }
                  />
                  
                  {/* Add more NavItems here as needed */}
                </ul>
              </nav>
            </div>
          </div>
          
          <div className="mt-auto border-t border-gray-200 pt-2 sm:pt-3 dark:border-gray-800">
            <Link 
              href="/settings"
              className={cn(
                "mb-1 sm:mb-2 flex w-full items-center gap-2 sm:gap-3 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30",
                !isSidebarExpanded && "justify-center px-0"
              )}
              onClick={handleMobileLinkClick}
            >
              <Settings className="size-4 sm:size-5 text-primary-500 dark:text-primary-300" />
              {isSidebarExpanded && <span className="text-bold text-gray-700 dark:text-gray-300">Settings</span>}
            </Link>
            
            <button 
              className={cn(
                "mb-1 sm:mb-2 flex w-full items-center gap-2 sm:gap-3 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30",
                !isSidebarExpanded && "justify-center px-0"
              )}
              onClick={toggleDarkMode}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 sm:size-5 text-primary-500 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4 sm:size-5 text-primary-500 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {isSidebarExpanded && <span className="text-bold text-gray-700 dark:text-gray-300">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
            </button>
            
            <button 
              className={cn(
                "flex w-full items-center gap-2 sm:gap-3 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm text-accent-600 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-900/30",
                !isSidebarExpanded && "justify-center px-0"
              )}
              onClick={handleSignOut}
            >
              <Authentication className="size-4 sm:size-5" />
              {isSidebarExpanded && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile toggle button - visible only when sidebar is closed */}
      {isMobile && !isSidebarExpanded && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-40 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md"
          aria-label="Open sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600 dark:text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </>
  );
}
