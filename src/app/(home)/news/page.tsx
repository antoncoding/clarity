"use client";

import { NewMessageInterface } from "@/components/Chat/NewMessageInterface";
import { useRouter } from "next/navigation";
import { sendMessageToApi } from "@/utils/db";

export default function NewsPage() {
  const router = useRouter();

  const handleSendMessage = async (message: string) => {
    
    // Send the message to the API with the new conversation ID
    const {conversationId} = await sendMessageToApi(message);
    
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