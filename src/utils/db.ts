import { createClient } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Message type for the chat interface
export type Message = {
  id: string;
  content: string;
  sender: "user" | "agent";
  status: "sent" | "processing" | "completed" | "error";
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
  status: 'sent' | 'processing' | 'completed' | 'error';
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

/**
 * Creates a new conversation
 */
export async function createConversation(title?: string): Promise<Conversation> {
  const supabase = createClient();
  
  // Get the current user to include user_id
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error("You must be logged in to start a conversation");
  }
  
  // Create a conversation with a random number ID if no title provided
  const conversationTitle = title || `Conversation #${Math.floor(Math.random() * 10000)}`;
  
  const { data, error } = await supabase
    .from("conversations")
    .insert([{ 
      title: conversationTitle,
      user_id: userData.user.id 
    }])
    .select()
    .single();
    
  if (error) {
    console.error("Error creating conversation:", error);
    throw new Error(`Error creating conversation: ${error.message}`);
  }
  
  return data;
}

/**
 * Creates a new message in a conversation
 */
export async function createMessage(conversationId: string, content: string, sender: "user" | "agent", status: "sent" | "processing" | "completed" | "error" = "sent", message_type?: 'message' | 'thought' | 'tool_call' | 'tool_result' | 'error'): Promise<MessageRow> {
  const supabase = createClient();
  
  // Get the current user to include user_id
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    throw new Error("You must be logged in to send a message");
  }
  
  const messageId = uuidv4();
  
  const { data, error } = await supabase
    .from("messages")
    .insert([{
      id: messageId,
      conversation_id: conversationId,
      content,
      sender,
      status,
      message_type
    }])
    .select()
    .single();
    
  if (error) {
    console.error("Error creating message:", error);
    throw new Error(`Error creating message: ${error.message}`);
  }
  
  return data;
}

/**
 * Fetches all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error("Error fetching conversations:", error);
    throw new Error(`Error fetching conversations: ${error.message}`);
  }
  
  return data || [];
}

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
export async function sendMessageToApi(messageContent: string, conversationId: string, message_type?: 'message' | 'thought' | 'tool_call' | 'tool_result' | 'error'): Promise<void> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageContent,
        conversationId: conversationId,
        message_type
      }),
      credentials: "include",
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    // The agent response will be handled via the real-time subscription
    return;
  } catch (error) {
    console.error("Error calling chat API:", error);
    throw error;
  }
}
