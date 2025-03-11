"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type ConversationContextType = {
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
};

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <ConversationContext.Provider value={{ selectedConversationId, setSelectedConversationId }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return context;
}
