"use client";

import { ChatInterface } from "./ChatInterface";
import { useConversation } from "@/context/conversation-context";

export function ChatContainer() {
  const { selectedConversationId } = useConversation();

  return (
    <div className="h-full">
      <ChatInterface initialConversationId={selectedConversationId} />
    </div>
  );
}
