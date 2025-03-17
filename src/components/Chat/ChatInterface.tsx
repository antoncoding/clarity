"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { BounceLoader } from "react-spinners";
import { 
  Message, 
  MessageRow, 
  getConversationById, 
  getConversationMessages, 
  subscribeToConversationMessages,
  sendMessageToApi
} from "@/utils/db";
import { ToolResult } from "./ToolResult";
import { MarkdownContent } from "./MarkdownContent";

interface MessageProps {
  content: string;
  status?: string;
  isProcessing?: boolean;
  metadata?: any;
  message_type?: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
}

const UserMessage = ({ content }: MessageProps) => (
  <div className="flex justify-end mb-2 sm:mb-4 animate-message">
    <div className="p-2 sm:p-3 rounded-lg max-w-[85%] sm:max-w-[80%] bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 animate-message-content">
      <div className="prose dark:prose-invert max-w-none font-light text-sm sm:text-base">
        <MarkdownContent content={content} />
      </div>
    </div>
  </div>
);

const AIMessage = ({ content, isProcessing, metadata, message_type }: MessageProps) => (
  <div className="flex justify-start mb-2 sm:mb-4 animate-message">
    <div className="p-2 sm:p-3 rounded-lg max-w-[85%] sm:max-w-[80%] bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white animate-message-content">
      {isProcessing ? (
        <div className="flex items-center">
          <BounceLoader color="#0047AB" size={20} />
          <span className="ml-2 text-sm">Thinking...</span>
        </div>
      ) : (
        <div className={`prose dark:prose-invert max-w-none ${
          message_type === "tool_call" || message_type === "tool_result"
            ? "text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-light italic"
            : "font-light text-sm sm:text-base"
        }`}>
          {message_type === "tool_result" ? (
            <ToolResult 
              content={content}
              metadata={metadata}
            />
          ) : (
            <MarkdownContent content={content} />
          )}
        </div>
      )}
    </div>
  </div>
);

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string>("New Chat");
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  
  // Clear out component state when changing conversations
  useEffect(() => {
    // Reset component state
    setMessages([]);
    setInputValue("");
    setIsLoading(false);
    setIsLoadingHistory(true);
    setIsAgentProcessing(false);
  }, []);

  // Load existing messages when conversation ID changes
  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!conversationId) {
        return;
      }
      
      try {
        console.log(`Loading messages for conversation: ${conversationId}`);
        
        // Fetch conversation details to get the title
        const conversationData = await getConversationById(conversationId);
        if (conversationData) {
          setConversationTitle(conversationData.title);
        }
        
        // Fetch messages for this conversation
        const loadedMessages = await getConversationMessages(conversationId);
        
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
          console.log(`Loaded ${loadedMessages.length} messages for conversation ${conversationId}`);
        } else {
          console.log(`No messages found for conversation ${conversationId}`);
        }
      } catch (err) {
        console.error("Error in loadConversationMessages:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    if (conversationId) {
      loadConversationMessages();
    }
  }, [conversationId]);

  // Set up real-time subscription to messages
  useEffect(() => {
    if (!conversationId) return;
    
    console.log(`Setting up realtime subscription for conversation: ${conversationId}`);
    
    // Set up subscription handlers
    const handleInsert = (newMessage: MessageRow) => {
      console.log('New message inserted:', newMessage);
      
      // Check if this message already exists in our UI (to avoid duplicates)
      setMessages((prev) => {
        // If message with this ID already exists, don't add it again
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        
        // Enhanced duplicate detection: also check content for user messages to avoid duplications
        // This handles the case where we optimistically added a user message with a temporary ID
        if (newMessage.sender === 'user' && 
            prev.some(msg => msg.sender === 'user' && 
                            msg.content === newMessage.content &&
                            // Only consider recent messages (within last 5 seconds) to avoid false positives
                            msg.timestamp && 
                            (new Date().getTime() - msg.timestamp.getTime() < 5000))) {
          console.log('Detected duplicate user message, not adding again');
          return prev;
        }
        
        // If we receive any completed or responded message from the agent, we can clear the thinking status
        if (newMessage.sender === 'agent' && 
            (newMessage.status === 'completed' || newMessage.status === 'responded')) {
          setIsAgentProcessing(false);
        }
        
        // Otherwise just add the new message
        return [
          ...prev,
          {
            id: newMessage.id,
            content: newMessage.content,
            sender: newMessage.sender as "user" | "agent",
            status: newMessage.status as "sent" | "processing" | "completed" | "error" | "responded",
            timestamp: new Date(newMessage.created_at),
            metadata: newMessage.metadata,
            message_type: newMessage.message_type
          }
        ];
      });
    };
    
    const handleUpdate = (updatedMessage: MessageRow) => {
      console.log('Message updated:', updatedMessage);
      
      // If the status changed from processing to completed or responded, log it
      if (updatedMessage.status === "completed" || updatedMessage.status === "responded") {
        console.log(`✅ Agent response ${updatedMessage.status} for message:`, updatedMessage.id);
        setIsAgentProcessing(false);
      }
      
      setMessages((prev) =>
        prev.map((msg) => {
          // Match by ID for existing database messages
          if (msg.id === updatedMessage.id) {
            console.log(`Updating message with id ${msg.id}`, updatedMessage);
            return {
              ...msg,
              content: updatedMessage.content,
              status: updatedMessage.status as "sent" | "processing" | "completed" | "error" | "responded",
              metadata: updatedMessage.metadata,
              message_type: updatedMessage.message_type
            };
          }
          
          return msg;
        })
      );
    };
    
    // Subscribe to conversation messages
    const unsubscribe = subscribeToConversationMessages(
      conversationId,
      handleInsert,
      handleUpdate
    );
    
    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  // Check if we should show the thinking indicator
  useEffect(() => {
    if (messages.length === 0) {
      setIsAgentProcessing(false);
      return;
    }
    
    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    
    // If the latest message is from the user and has "sent" status, show thinking indicator
    if (latestMessage.sender === "user" && latestMessage.status === "sent") {
      setIsAgentProcessing(true);
    } else if (latestMessage.sender === "agent" && 
              (latestMessage.status === "completed" || latestMessage.status === "responded")) {
      // If the latest message is from the agent and is completed or responded, hide thinking indicator
      setIsAgentProcessing(false);
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || !conversationId) return;

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
        message_type: "message"
      };
      
      // Add temp message to UI for immediate feedback (will be replaced by DB version on subscription)
      setMessages((prevMessages) => [...prevMessages, newUserMessage]);
      
      // Add a temporary processing message from the agent
      setIsAgentProcessing(true);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      // Send message to API - let the API handle database insertion
      // No direct database call here - avoiding duplication
      await sendMessageToApi(messageContent, conversationId);
      
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
          message_type: "error"
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
      <div className="border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4 flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-medium truncate max-w-[70%]">{conversationTitle}</h2>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <BounceLoader color="#0047AB" size={40} />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              message.sender === "user" ? (
                <UserMessage 
                  key={message.id}
                  content={message.content}
                />
              ) : (
                <AIMessage
                  key={message.id}
                  content={message.content}
                  status={message.status}
                  isProcessing={message.status === "processing"}
                  metadata={message.metadata}
                  message_type={message.message_type}
                />
              )
            ))}
            {isAgentProcessing && (
              <AIMessage
                content=""
                isProcessing={true}
              />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2 sm:p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm sm:text-base"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-md flex items-center justify-center min-w-[60px] sm:min-w-[80px]"
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <BounceLoader color="#ffffff" size={20} />
            ) : (
              <span className="hidden sm:inline">Send</span>
            )}
            {!isLoading && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
