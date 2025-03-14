"use client";

import { useState } from "react";
import { ChatInterface } from "./ChatInterface";
import { NewMessageInterface } from "./NewMessageInterface";
import { useConversation } from "@/context/conversation-context";
import { sendMessageToApi } from "@/utils/db";

export function ChatContainer() {
  const { selectedConversationId, setSelectedConversationId } = useConversation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Track if we're in a new conversation or existing one
  const isNewConversation = selectedConversationId === null;
  
  // Handle starting a new conversation
  const handleSendNewMessage = async (messageContent: string) => {
    setIsLoading(true);
    
    try {
      
      // Send the message to the API (which will create the message in the database)
      const res = await sendMessageToApi(messageContent);
      setSelectedConversationId(res.conversationId)
      
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
