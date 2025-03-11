"use client";

import { useState } from "react";
import { ChatInterface } from "./ChatInterface";
import { NewMessageInterface } from "./NewMessageInterface";
import { useConversation } from "@/context/conversation-context";
import { createConversation, sendMessageToApi } from "@/utils/db";

export function ChatContainer() {
  const { selectedConversationId, setSelectedConversationId } = useConversation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Track if we're in a new conversation or existing one
  const isNewConversation = selectedConversationId === null;
  
  // Handle starting a new conversation
  const handleSendNewMessage = async (messageContent: string) => {
    setIsLoading(true);
    
    try {
      // Create a new conversation
      const conversation = await createConversation();
      
      // Set the conversation ID to transition to the conversation interface
      setSelectedConversationId(conversation.id);
      
      // Send the message to the API (which will create the message in the database)
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
      {isNewConversation ? (
        // Show the new message UI when no conversation is selected
        <NewMessageInterface onSendMessage={handleSendNewMessage} isLoading={isLoading}/>
      ) : (
        // Show the conversation UI when a conversation is selected
        <ChatInterface />
      )}
    </div>
  );
}
