import React from 'react';
import { Sidebar } from "@/components/Layouts/sidebar";
import { Providers } from './providers';
import "@/css/style.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </Providers>
      </body>
    </html>
  );
} 