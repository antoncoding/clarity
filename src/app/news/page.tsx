"use client";

import { NewMessageInterface } from "@/components/Chat/NewMessageInterface";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
import { sendMessageToApi } from "@/utils/db";

export default function NewsPage() {
  const router = useRouter();

  const handleSendMessage = async (message: string) => {
    // Generate a new conversation ID
    const conversationId = uuidv4();
    
    // Send the message to the API with the new conversation ID
    await sendMessageToApi(message, conversationId);
    
    // Navigate to the new conversation
    router.push(`/news/${conversationId}`);
  };

  return (
    <NewMessageInterface 
      onSendMessage={handleSendMessage}
      isLoading={false}
    />
  );
} 