import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generate a random 8-character alphanumeric referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters (0/O, 1/I)
  let result = '';
  
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}
  

/**
 * Database service class for agent-related database operations
 */
export class AgentDBService {
  private client: SupabaseClient;
  private static instance: AgentDBService;
  
  public constructor(client: SupabaseClient) {
    this.client = client;
  }
  
  /**
   * Create a new instance specifically for the current user
   */
  public static async createForUser(userId: string, useServiceRole: boolean = false): Promise<AgentDBService> {
    console.log('Creating new instance for user:', userId);
    const client = await createClient({ 
      useServiceRole,
      // Optional: Pass userId to ensure correct auth context
    });
    return new AgentDBService(client);
  }
  
  /**
   * Fetch conversation history from the database
   */
  async getConversationHistory(conversationId: string) {
    console.log(`📚 Getting conversation history for: ${conversationId}`);
    
    try {
      const { data, error } = await this.client
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
        
      if (error) {
        console.error("Error fetching conversation history:", error);
        return [];
      }
      
      console.log(`📚 Fetched ${data.length} messages from conversation history`);
      return data;
    } catch (error) {
      console.error("Error in getConversationHistory:", error);
      return [];
    }
  }
  
  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title: string) {
    try {
      const { data, error } = await this.client
        .from("conversations")
        .insert([{ user_id: userId, title: title.substring(0, 50) }])
        .select("id")
        .single();
        
      if (error) {
        console.error("Error creating conversation:", error);
        throw new Error("Error creating conversation");
      }
      
      return data;
    } catch (error) {
      console.error("Error in createConversation:", error);
      throw error;
    }
  }
  
  /**
   * Verify conversation ownership
   */
  async verifyConversationOwnership(conversationId: string, userId: string) {
    try {
      const { data, error } = await this.client
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single();
        
      if (error || !data) {
        console.log('verify conversation ownership error', error)
        console.error("Conversation not found or not owned by user");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in verifyConversationOwnership:", error);
      return false;
    }
  }
  
  /**
   * Insert a new message
   */
  async insertMessage(conversationId: string, content: string, sender: 'user' | 'agent', status: string, messageType?: string, metadata?: any) {
    try {
      const { data, error } = await this.client
        .from("messages")
        .insert([{
          conversation_id: conversationId,
          content: content,
          sender: sender,
          status: status,
          message_type: messageType,
          metadata: metadata || {}
        }])
        .select("id")
        .single();
        
      if (error) {
        console.error("Error inserting message:", error);
        throw new Error("Error inserting message");
      }
      
      return data;
    } catch (error) {
      console.error("Error in insertMessage:", error);
      throw error;
    }
  }
  
  /**
   * Insert multiple agent messages
   */
  async insertAgentMessages(messages: Array<{
    conversation_id: string;
    content: string;
    sender: string;
    status: string;
    message_type?: string;
    metadata?: any;
  }>) {
    try {
      const { error } = await this.client
        .from("messages")
        .insert(messages);
        
      if (error) {
        console.error("Error inserting agent messages:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in insertAgentMessages:", error);
      return false;
    }
  }
  
  /**
   * Insert a single agent message
   */
  async insertAgentMessage(message: {
    conversation_id: string;
    content: string;
    sender: string;
    status: string;
    message_type?: string;
    metadata?: any;
  }) {
    try {
      console.log(`💾 DB: Inserting agent message of type: ${message.message_type} to conversation: ${message.conversation_id}`);
      
      const { data, error } = await this.client
        .from("messages")
        .insert(message)
        .select("id")
        .single();
        
      if (error) {
        console.error("❌ DB: Error inserting agent message:", error);
        console.error("❌ DB: Failed message content:", message.content.substring(0, 100));
        return null;
      }
      
      console.log(`✅ DB: Successfully inserted agent message with ID: ${data.id}`);
      return data;
    } catch (error) {
      console.error("❌ DB: Unexpected error in insertAgentMessage:", error);
      return null;
    }
  }
  
  /**
   * Update message status
   */
  async updateMessageStatus(messageId: string, status: string) {
    try {
      const { error } = await this.client
        .from("messages")
        .update({ status: status })
        .eq("id", messageId);
        
      if (error) {
        console.error("Error updating message status:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in updateMessageStatus:", error);
      return false;
    }
  }
  
  /**
   * Update conversation usage statistics
   */
  async updateConversationUsage(
    userId: string,
    conversationId: string, 
    inputTokens: number, 
    outputTokens: number, 
    cost: number
  ) {
    try {
      
      // First, check if entry exists
      const { data: existingData, error: fetchError } = await this.client
        .from("conversation_usage")
        .select("*")
        .eq("conversation_id", conversationId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error("Error fetching conversation usage:", fetchError);
        return false;
      }
      
      if (existingData) {
        // Update existing entry
        const updateData = {
          input_tokens: existingData.input_tokens + inputTokens,
          output_tokens: existingData.output_tokens + outputTokens,
          cost: existingData.cost + cost,
          updated_at: new Date().toISOString()
        };
        
        console.log(`🏦 Updating conversation usage. New total cost: $${updateData.cost}`);
        
        const { error: updateError } = await this.client
          .from("conversation_usage")
          .update(updateData)
          .eq("conversation_id", conversationId);
          
        if (updateError) {
          console.error("Error updating conversation usage:", updateError);
          console.error("Update payload:", updateData);
          return false;
        }
      } else {
        // Create new entry
        const insertData = {
          user_id: userId,
          conversation_id: conversationId,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost: cost,
          updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await this.client
          .from("conversation_usage")
          .insert(insertData);
          
        if (insertError) {
          console.error("Error inserting conversation usage:", insertError);
          console.error("Insert payload:", insertData);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error in updateConversationUsage:", error);
      return false;
    }
  }

  /**
   * Update user-level usage statistics
   */
  async updateUserUsage(
    userId: string,
    cost: number
  ) {
    try {
      // First, check if entry exists
      const { data: existingData, error: fetchError } = await this.client
        .from("user_accounts")
        .select("lifetime_usage_cost")
        .eq("user_id", userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching user usage:", fetchError);
        return false;
      }
      
      if (existingData) {
        // Update existing entry
        const updateData = {
          lifetime_usage_cost: existingData.lifetime_usage_cost + cost,
          updated_at: new Date().toISOString()
        };
        
        const { error: updateError } = await this.client
          .from("user_accounts")
          .update(updateData)
          .eq("user_id", userId);
          
        if (updateError) {
          console.error("Error updating user usage:", updateError);
          console.error("Update payload:", updateData);
          return false;
        }
      } else {
        // Generate a user-friendly referral code
        const referralCode = generateReferralCode();
        
        // Create new entry
        const insertData = {
          user_id: userId,
          lifetime_usage_cost: cost,
          referral_code: referralCode,
          updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await this.client
          .from("user_accounts")
          .insert(insertData);
          
        if (insertError) {
          console.error("Error inserting user usage:", insertError);
          console.error("Insert payload:", insertData);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error in updateUserUsage:", error);
      return false;
    }
  }
  
  /**
   * Get user ID associated with a conversation
   */
  async getConversationUserId(conversationId: string): Promise<string | null> {
    try {
      const { data, error } = await this.client
        .from("conversations")
        .select("user_id")
        .eq("id", conversationId)
        .single();
        
      if (error) {
        console.error("Error fetching user ID for conversation:", error);
        return null;
      }
      
      return data?.user_id || null;
    } catch (error) {
      console.error("Error in getConversationUserId:", error);
      return null;
    }
  }
  
}
