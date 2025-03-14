import { createClient } from './supabase/client';

// Message type for the chat interface
export type Message = {
  id: string;
  content: string;
  sender: "user" | "agent";
  status: "sent" | "processing" | "completed" | "error" | "responded";
  timestamp: Date;
  metadata?: {
    toolUsageHistory?: Array<{
      tool: string;
      input: string;
      output: string;
      timestamp: string;
    }>;
    stepHistory?: Array<{
      step: string;
      type: string;
      output?: string;
      timestamp: string;
    }>;
    executionSummary?: {
      toolsUsed: number;
      stepsExecuted: number;
      executionTime: string;
    }
  };
  message_type?: 'message' | 'thought' | 'tool_call' | 'tool_result' | 'error';
};

// Database message row type
export type MessageRow = {
  id: string;
  conversation_id: string;
  content: string;
  sender: 'user' | 'agent';
  status: 'sent' | 'processing' | 'completed' | 'error' | 'responded';
  created_at: string;
  updated_at: string;
  user_id?: string;
  metadata?: any; // For storing tool usage and execution history
  message_type?: 'message' | 'thought' | 'tool_call' | 'tool_result' | 'error';
};

// Conversation type
export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  user_id?: string;
};

// Usage statistics type
export type UsageStats = {
  id: string;
  conversation_id: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  timestamp: string;
};

/**
 * Fetches a specific conversation by ID
 */
export async function getConversationById(id: string): Promise<Conversation> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    console.error(`Error fetching conversation ${id}:`, error);
    throw new Error(`Error fetching conversation: ${error.message}`);
  }
  
  return data;
}

/**
 * Fetches all messages for a conversation
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
    
  if (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    throw new Error(`Error fetching messages: ${error.message}`);
  }
  
  // Convert database message format to client message format
  return (data || []).map(msg => ({
    id: msg.id,
    content: msg.content,
    sender: msg.sender as "user" | "agent",
    status: msg.status as "sent" | "processing" | "completed" | "error",
    timestamp: new Date(msg.created_at),
    metadata: msg.metadata,
    message_type: msg.message_type
  }));
}

/**
 * Deletes a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = createClient();
  
  // Delete the messages first
  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);
    
  if (messagesError) {
    console.error(`Error deleting messages for conversation ${conversationId}:`, messagesError);
    throw new Error(`Error deleting messages: ${messagesError.message}`);
  }
  
  // Then delete the conversation
  const { error: conversationError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);
    
  if (conversationError) {
    console.error(`Error deleting conversation ${conversationId}:`, conversationError);
    throw new Error(`Error deleting conversation: ${conversationError.message}`);
  }
}

/**
 * Sets up a real-time subscription for messages in a conversation
 */
export function subscribeToConversationMessages(
  conversationId: string, 
  onInsert: (message: MessageRow) => void,
  onUpdate: (message: MessageRow) => void
) {
  const supabase = createClient();
  
  const channel = supabase.channel(`messages:${conversationId}`);
  
  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, 
      (payload: any) => {
        console.log('New message inserted:', payload);
        onInsert(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, 
      (payload: any) => {
        console.log('Message updated:', payload);
        onUpdate(payload.new);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Sets up a real-time subscription for conversations
 */
export function subscribeToConversations(
  onChanges: () => void
) {
  const supabase = createClient();
  
  const channel = supabase.channel('public:conversations');
  
  channel
    .on('postgres_changes', {
      event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'conversations',
    }, () => {
      onChanges(); // Refresh the entire list on any change
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Sends a message to the API for processing
 * The API handles message creation in the database - do not create messages directly
 */
export async function sendMessageToApi(
  messageContent: string, 
  conversationId?: string, 
): Promise<{ success: boolean, messageId: string, conversationId: string }> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageContent,
        conversationId: conversationId,
      }),
      credentials: "include",
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    // The agent response will be handled via the real-time subscription
    const data = await response.json()
    return data 
  } catch (error) {
    console.error("Error calling chat API:", error);
    throw error;
  }
}

/**
 * Gets usage statistics for a conversation
 */
export async function getConversationUsageStats(conversationId: string): Promise<UsageStats[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("usage_stats")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("timestamp", { ascending: true });
    
  if (error) {
    console.error(`Error fetching usage stats for conversation ${conversationId}:`, error);
    throw new Error(`Error fetching usage stats: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Gets total usage statistics for a user
 */
export async function getUserUsageStats(): Promise<{
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  conversations_count: number;
}> {
  const supabase = createClient();
  
  // Get the current user
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error("You must be logged in to access usage statistics");
  }
  
  // Get all conversation IDs for this user
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userData.user.id);
    
  if (convError) {
    console.error("Error fetching user conversations:", convError);
    throw new Error(`Error fetching user conversations: ${convError.message}`);
  }
  
  const conversationIds = conversations.map(c => c.id);
  
  if (conversationIds.length === 0) {
    return {
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost: 0,
      conversations_count: 0
    };
  }
  
  // Get usage stats for these conversations
  const { data: stats, error: statsError } = await supabase
    .from("usage_stats")
    .select("input_tokens, output_tokens, cost")
    .in("conversation_id", conversationIds);
    
  if (statsError) {
    console.error("Error fetching usage statistics:", statsError);
    throw new Error(`Error fetching usage statistics: ${statsError.message}`);
  }
  
  return {
    total_input_tokens: stats.reduce((sum, item) => sum + (item.input_tokens || 0), 0),
    total_output_tokens: stats.reduce((sum, item) => sum + (item.output_tokens || 0), 0),
    total_cost: stats.reduce((sum, item) => sum + (item.cost || 0), 0),
    conversations_count: conversationIds.length
  };
}
