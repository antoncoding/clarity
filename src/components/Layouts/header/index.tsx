"use client";

import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { UserInfo } from "./user-info";

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-4 shadow-sm dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      <div className="flex items-center">
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="rounded-lg border px-1.5 py-1 dark:border-stroke-dark dark:bg-[#020D1A] hover:dark:bg-[#FFFFFF1A] lg:hidden"
          >
            <MenuIcon />
            <span className="sr-only">Toggle Sidebar</span>
          </button>
        )}

        <h1 className="ml-2 text-heading-5 font-bold text-dark dark:text-white">
          Clarity
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <UserInfo />
      </div>
    </header>
  );
}
