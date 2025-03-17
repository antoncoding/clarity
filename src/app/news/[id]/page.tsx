import { ChatInterface } from "@/components/Chat/ChatInterface";

export default function NewsChat({ params }: { params: { id: string } }) {
  return <ChatInterface conversationId={params.id} />;
} 