"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { BounceLoader } from "react-spinners";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface ConversationListProps {
  onSelectConversation: (id: string | null) => void;
  selectedConversationId: string | null;
}

export function ConversationList({
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch conversations from the database
  const fetchConversations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
    } else {
      setConversations(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Set up real-time subscription for conversations
    const channel = supabase.channel('public:conversations');
    
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
      }, (payload) => {
        console.log('New conversation:', payload);
        fetchConversations(); // Refresh the entire list
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, (payload) => {
        console.log('Conversation updated:', payload);
        fetchConversations(); // Refresh the entire list
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="font-bold text-primary-700 dark:text-primary-300">Conversations</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => onSelectConversation(null)}
          className={`w-full text-left mb-2 p-3 rounded-lg transition-colors ${
            selectedConversationId === null
              ? "bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <div className="font-medium">+ New Conversation</div>
        </button>
        
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <BounceLoader color="#8A63D2" size={40} className="mx-auto" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No previous conversations
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full text-left mb-2 p-3 rounded-lg transition-colors ${
                selectedConversationId === conversation.id
                  ? "bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="font-medium truncate">{conversation.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {format(new Date(conversation.created_at), "MMM d, yyyy • h:mm a")}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
