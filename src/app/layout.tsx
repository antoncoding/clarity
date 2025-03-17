import React from 'react';
import { Sidebar } from "@/components/Layouts/sidebar";
import { Providers } from './providers';
import "@/css/style.css"
import type { PropsWithChildren } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clarity",
  description: "Read news smartly",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>

          <div className="flex min-h-screen">
            <Sidebar />

            <div className="w-full bg-gray-50 dark:bg-gray-dark">
              <main className="h-screen p-2">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
