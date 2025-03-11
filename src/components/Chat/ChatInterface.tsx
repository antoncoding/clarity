"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  content: string;
  sender: "user" | "agent";
  status?: "sent" | "processing" | "completed" | "error";
  timestamp: Date;
};

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: {
    id: string;
    content: string;
    sender: "user" | "agent";
    status: "sent" | "processing" | "completed" | "error";
    created_at: string;
    conversation_id: string;
  };
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your news agent. How can I help you today?",
      sender: "agent",
      status: "completed",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Set up real-time subscription to messages
  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to changes in the messages table for this conversation
    const channel = supabase.channel(`messages:${conversationId}`);
    
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: any) => {
        console.log('New message inserted:', payload);
        const newMessage = payload.new;
        setMessages((prev) => [
          ...prev,
          {
            id: newMessage.id,
            content: newMessage.content,
            sender: newMessage.sender,
            status: newMessage.status,
            timestamp: new Date(newMessage.created_at),
          },
        ]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: any) => {
        console.log('Message updated:', payload);
        const updatedMessage = payload.new;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === updatedMessage.id
              ? {
                  ...msg,
                  content: updatedMessage.content,
                  status: updatedMessage.status,
                }
              : msg
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    setIsLoading(true);
    
    // Add user message to local state immediately for better UX
    const tempUserMessageId = uuidv4();
    const userMessage: Message = {
      id: tempUserMessageId,
      content: inputValue,
      sender: "user",
      status: "sent",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Add temporary processing message
    const tempAgentMessageId = uuidv4();
    const processingMessage: Message = {
      id: tempAgentMessageId,
      content: "Processing your request...",
      sender: "agent",
      status: "processing",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, processingMessage]);
    setInputValue("");
    
    try {
      // Send message to backend API with credentials included
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
        // Include credentials to send cookies
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("🚨 API error:", response.status, errorData);
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update conversation ID if this is a new conversation
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
      // The real-time subscription will handle updating the messages
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Update the temporary processing message with an error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAgentMessageId
            ? {
                ...msg,
                content: "Sorry, there was an error processing your request. Please try again.",
                status: "error",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to render message content with markdown support
  const renderMessageContent = (content: string) => {
    if (content.includes('##') || content.includes('[')) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>
            {content}
          </ReactMarkdown>
        </div>
      );
    }
    return content;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-dark rounded-md shadow-sm">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-bold text-primary-700 dark:text-primary-300">News Agent Chat</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Ask me about the latest news and events</p>
      </div>
      
      {/* Messages container with flex to position content */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {/* Empty space to push content down */}
        <div className="flex-grow min-h-[30vh]"></div>
        
        {/* Messages */}
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                  message.sender === "user"
                    ? "bg-primary-500 text-white"
                    : "bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100"
                }`}
              >
                {message.status === "processing" ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse">Processing your request...</div>
                    <div className="w-2 h-2 bg-primary-300 dark:bg-primary-700 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-primary-300 dark:bg-primary-700 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-primary-300 dark:bg-primary-700 rounded-full animate-bounce delay-300"></div>
                  </div>
                ) : (
                  renderMessageContent(message.content)
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input area */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about news..."
            disabled={isLoading}
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:text-white disabled:opacity-70"
          />
          <button
            type="submit"
            className="rounded-full bg-primary-600 hover:bg-primary-700 p-2 text-white transition-colors disabled:opacity-70 disabled:hover:bg-primary-600"
            disabled={!inputValue.trim() || isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
