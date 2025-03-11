"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from "react-markdown";
import { useConversation } from "@/context/conversation-context";
import { 
  Message, 
  MessageRow, 
  getConversationById, 
  getConversationMessages, 
  subscribeToConversationMessages,
  sendMessageToApi
} from "@/utils/db";

// Define the payload type for Supabase real-time updates
interface PostgresChangesPayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: Partial<T> | null;
}

type RealtimeMessagePayload = PostgresChangesPayload<MessageRow>;

export function ChatInterface() {
  const { selectedConversationId, setSelectedConversationId } = useConversation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string>("New Chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Clear out component state when changing conversations
  useEffect(() => {
    // Reset component state
    setMessages([]);
    setInputValue("");
    setIsLoading(false);
    setIsLoadingHistory(true);
  }, [selectedConversationId]);

  // Load existing messages when conversation ID changes
  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!selectedConversationId) {
        return;
      }
      
      try {
        console.log(`Loading messages for conversation: ${selectedConversationId}`);
        
        // Fetch conversation details to get the title
        const conversationData = await getConversationById(selectedConversationId);
        if (conversationData) {
          setConversationTitle(conversationData.title);
        }
        
        // Fetch messages for this conversation
        const loadedMessages = await getConversationMessages(selectedConversationId);
        
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
          console.log(`Loaded ${loadedMessages.length} messages for conversation ${selectedConversationId}`);
        } else {
          console.log(`No messages found for conversation ${selectedConversationId}`);
        }
      } catch (err) {
        console.error("Error in loadConversationMessages:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    if (selectedConversationId) {
      loadConversationMessages();
    }
  }, [selectedConversationId]);

  // Set up real-time subscription to messages
  useEffect(() => {
    if (!selectedConversationId) return;
    
    console.log(`Setting up realtime subscription for conversation: ${selectedConversationId}`);
    
    // Set up subscription handlers
    const handleInsert = (newMessage: MessageRow) => {
      console.log('New message inserted:', newMessage);
      
      // Check if this message already exists in our UI (to avoid duplicates)
      setMessages((prev) => {
        // If message with this ID already exists, don't add it again
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        
        // Filter out temporary processing messages from agent if this is an agent message
        if (newMessage.sender === "agent") {
          return [
            ...prev.filter(msg => !(msg.status === "processing" && msg.sender === "agent")),
            {
              id: newMessage.id,
              content: newMessage.content,
              sender: newMessage.sender as "user" | "agent",
              status: newMessage.status as "sent" | "processing" | "completed" | "error",
              timestamp: new Date(newMessage.created_at),
            }
          ];
        }
        
        // Otherwise just add the new message
        return [
          ...prev,
          {
            id: newMessage.id,
            content: newMessage.content,
            sender: newMessage.sender as "user" | "agent",
            status: newMessage.status as "sent" | "processing" | "completed" | "error",
            timestamp: new Date(newMessage.created_at),
          }
        ];
      });
    };
    
    const handleUpdate = (updatedMessage: MessageRow) => {
      console.log('Message updated:', updatedMessage);
      
      // If the status changed from processing to completed, log it
      if (updatedMessage.status === "completed") {
        console.log("✅ Agent response completed for message:", updatedMessage.id);
      }
      
      setMessages((prev) =>
        prev.map((msg) => {
          // Match by ID for existing database messages
          if (msg.id === updatedMessage.id) {
            console.log(`Updating message with id ${msg.id}`, updatedMessage);
            return {
              ...msg,
              content: updatedMessage.content,
              status: updatedMessage.status as "sent" | "processing" | "completed" | "error",
            };
          }
          
          return msg;
        })
      );
    };
    
    // Subscribe to conversation messages
    const unsubscribe = subscribeToConversationMessages(
      selectedConversationId,
      handleInsert,
      handleUpdate
    );
    
    return () => {
      unsubscribe();
    };
  }, [selectedConversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || !selectedConversationId) return;

    try {
      setIsLoading(true);
      
      // Store message content before clearing input
      const messageContent = inputValue.trim();
      
      // Reset input field
      setInputValue("");
      
      // Optimistically add the message to the UI
      const tempMessageId = uuidv4();
      const newUserMessage: Message = {
        id: tempMessageId,
        content: messageContent,
        sender: "user",
        status: "sent",
        timestamp: new Date(),
      };
      
      // Add temp message to UI for immediate feedback (will be replaced by DB version on subscription)
      setMessages((prevMessages) => [...prevMessages, newUserMessage]);
      
      // Add a temporary processing message from the agent
      const tempAgentId = `temp-${uuidv4()}`;
      const tempAgentMessage: Message = {
        id: tempAgentId,
        content: "Thinking...",
        sender: "agent",
        status: "processing",
        timestamp: new Date(),
      };
      
      // Add agent processing indicator to UI
      setMessages((prevMessages) => [...prevMessages, tempAgentMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      // Send message to API - let the API handle database insertion
      // No direct database call here - avoiding duplication
      await sendMessageToApi(messageContent, selectedConversationId);
      
      // The actual messages (both user and agent) will be handled via the real-time subscription
    } catch (error) {
      console.error("Error sending message:", error);
      alert(`Error sending message: ${error instanceof Error ? error.message : String(error)}`);
      
      // Add error message to the chat
      setMessages((prevMessages) => [
        ...prevMessages.filter((msg) => msg.status !== "processing"), // Remove any processing messages
        {
          id: uuidv4(),
          content: "Sorry, there was an error sending your message. Please try again.",
          sender: "agent",
          status: "error",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center">
        <h2 className="text-lg font-medium">{conversationTitle}</h2>
        <button 
          onClick={() => setSelectedConversationId(null)}
          className="text-sm bg-primary-100 hover:bg-primary-200 text-primary-800 px-3 py-1 rounded"
        >
          New Chat
        </button>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === "user"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white"
                  }`}
                >
                  {message.status === "processing" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse">⋯</div>
                      <span>{message.content}</span>
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md"
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-opacity-30 border-t-white rounded-full" />
            ) : (
              "Send"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
