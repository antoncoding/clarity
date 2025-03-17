"use client";

import { ChatInterface } from "@/components/Chat/ChatInterface";
import { useParams } from "next/navigation";

export default function NewsChat() {

  const {id} = useParams<{id: string}>();

  return <ChatInterface conversationId={id as string} />;
} 