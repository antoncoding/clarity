import "@/css/satoshi.css";
import "@/css/style.css";

import { Sidebar } from "@/components/Layouts/sidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "../providers";

export const metadata: Metadata = {
  title: "News Agent",
  description: "Interactive news agent chat interface",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NextTopLoader showSpinner={false} color="#8A63D2" />

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
