"use client";

import { useState } from "react";
import { ChatInterface } from "./ChatInterface";
import { NewMessageInterface } from "./NewMessageInterface";
import { useConversation } from "@/context/conversation-context";
import { createConversationWithMessage } from "@/utils/db";

export function ChatContainer() {
  const { selectedConversationId, setSelectedConversationId } = useConversation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Track if we're in a new conversation or existing one
  const isNewConversation = selectedConversationId === null;
  
  // Handle starting a new conversation
  const handleSendNewMessage = async (messageContent: string) => {
    setIsLoading(true);
    
    try {
      // Use the utility function to create a conversation with an initial message
      const newConversationId = await createConversationWithMessage(messageContent);
      
      // Set the conversation ID to transition to the conversation interface
      setSelectedConversationId(newConversationId);
      
      // The agent response will be handled via the real-time subscription in ChatInterface
    } catch (error) {
      console.error("Error sending initial message:", error);
      alert("Failed to start conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset to new message interface
  const handleStartNewChat = () => {
    setSelectedConversationId(null);
  };
  
  return (
    <div className="h-full">
      {isNewConversation ? (
        // Show the new message UI when no conversation is selected
        <NewMessageInterface onSendMessage={handleSendNewMessage} />
      ) : (
        // Show the conversation UI when a conversation is selected
        <ChatInterface />
      )}
    </div>
  );
}
