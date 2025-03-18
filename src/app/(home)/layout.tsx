import React from 'react';
import { Sidebar } from "@/components/Layouts/sidebar";
import type { PropsWithChildren } from "react";

export default function DefaultLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full bg-gray-50 dark:bg-gray-dark">
        <main className="h-screen p-2">
          {children}
        </main>
      </div>
    </div>
  );
} 