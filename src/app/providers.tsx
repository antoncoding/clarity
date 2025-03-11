"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { ConversationProvider } from "@/context/conversation-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <SidebarProvider>
        <ConversationProvider>
          {children}
        </ConversationProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}
