"use client";

import { useState } from "react";
import { useConversation } from "@/context/conversation-context";
import { NewMessageInterface } from "./NewMessageInterface";
import { ChatInterface } from "./ChatInterface";
import { createConversation, sendMessageToApi } from "@/utils/db";

export default function Conversations() {
  const { selectedConversationId, setSelectedConversationId } = useConversation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle starting a new conversation
  const handleSendNewMessage = async (messageContent: string) => {
    setIsLoading(true);
    
    try {
      // Create a new conversation only - don't create the message directly
      const conversation = await createConversation();
      
      // Set the conversation ID to transition to the conversation interface
      setSelectedConversationId(conversation.id);
      
      // Send message to API - let the API handle message creation to avoid duplication
      await sendMessageToApi(messageContent, conversation.id);
      
      // The agent response will be handled via the real-time subscription in ChatInterface
    } catch (error) {
      console.error("Error sending initial message:", error);
      alert("Failed to start conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-full">
      {selectedConversationId ? (
        // Show existing conversation
        <ChatInterface />
      ) : (
        // Show new message interface
        <NewMessageInterface onSendMessage={handleSendNewMessage} />
      )}
    </div>
  );
}
