import { agent } from "./llm";
import { AgentDBService } from "./db";

// Re-export for backward compatibility
export { AGENT_MESSAGES } from "./utils";

// Define enums for better type safety
export enum MessageType {
  MESSAGE = 'message',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  THOUGHT = 'thought'
}

export enum SenderType {
  USER = 'user',
  AGENT = 'agent'
}

export enum EventType {
  ON_CHAT_MODEL_END = 'on_chat_model_end',
  ON_TOOL_END = 'on_tool_end'
}

export enum MessageStatus {
  COMPLETED = 'completed',
  RESPONDED = 'responded'
}

export type RawMessage = {
  id: string[] | string,
  kwargs: {
    content: string | string[] | Array<ContentItem>,
    additional_kwargs?: Record<string, unknown>,
    response_metadata?: Record<string, unknown>,
    tool_calls?: Array<ToolCall>,
    tool_call_id?: string,
    usage_metadata?: Record<string, unknown>,
    name?: string,
    id?: string,
    invalid_tool_calls?: Array<string>
  },
  lc: number,
  type: string,
}

export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
  arguments?: string;
  type?: string;
}

export interface TextContentItem {
  type: 'text';
  text: string;
}

export interface ToolUseContentItem {
  type: 'tool_use';
  id: string;
  name: string;
  input: string | Record<string, unknown>;
}

export type ContentItem = TextContentItem | ToolUseContentItem;

export interface ModelOutput {
  content?: string | ContentItem[] | null;
  tool_calls?: ToolCall[];
  usage_metadata?: Record<string, unknown>;
}

export interface ToolOutput {
  content?: string | Record<string, unknown>;
  [key: string]: unknown;
}

export interface ConversationMessage {
  sender: string;
  content: string;
  message_type?: string;
}

/**
 * Format conversation history into prompt-friendly format
 */
function formatMessagesForAgent(messages: ConversationMessage[]) {

  // We want to
  // 1. Remove all tool_call type, (intermediate messages like "Let me think about this")
  // 2. Remove all tool results that were too old
  const filteredMessages = messages.filter(msg => msg.message_type !== MessageType.TOOL_CALL)

  // Remove tool_result that not the last 8 messages
  const LOOKBACK = 8;
  const length = filteredMessages.length;
  const relevantMessages = filteredMessages
    .filter((msg, idx) => {
      return msg.message_type !== MessageType.TOOL_RESULT || idx >= length - LOOKBACK
    })

  return relevantMessages.map(msg => ({
    role: msg.sender === SenderType.USER ? "user" : "assistant",
    content: msg.content
  }));
}

/**
 * Extract content from raw model output
 */
function extractContentFromOutput(output: ModelOutput | null | undefined): { 
  finalContent: string; 
  toolCalls: ToolCall[] | null; 
  messageType: MessageType 
} {
  let finalContent = "";
  let toolCalls: ToolCall[] | null = null;
  let messageType = MessageType.THOUGHT;
  
  if (!output || !output.content) {
    return { finalContent, toolCalls, messageType };
  }
  
  const rawContent = output.content;
  console.log(`💬 Raw content type: ${typeof rawContent}`);
  
  // Handle string content (possibly JSON)
  if (typeof rawContent === 'string') {
    if (rawContent.trim().startsWith('[') && rawContent.trim().endsWith(']')) {
      try {
        console.log(`💬 Detected JSON array in string, parsing...`);
        const parsedContent = JSON.parse(rawContent);
        
        if (Array.isArray(parsedContent)) {
          const result = extractContentFromArray(parsedContent as ContentItem[]);
          finalContent = result.finalContent;
          toolCalls = result.toolCalls;
        } else {
          finalContent = rawContent;
        }
      } catch (e) {
        console.log(`💬 Error parsing JSON: ${e}, using raw content`);
        finalContent = rawContent;
      }
    } else {
      finalContent = rawContent;
    }
    
    messageType = toolCalls && toolCalls.length > 0 ? MessageType.TOOL_CALL : MessageType.MESSAGE;
  }
  // Handle array content directly
  else if (Array.isArray(rawContent)) {
    console.log(`💬 Content is direct array with ${rawContent.length} items`);
    const result = extractContentFromArray(rawContent as ContentItem[]);
    finalContent = result.finalContent;
    toolCalls = result.toolCalls;
    messageType = toolCalls && toolCalls.length > 0 ? MessageType.TOOL_CALL : MessageType.MESSAGE;
  }
  // Handle object with text property
  else if (typeof rawContent === 'object' && rawContent !== null && 'text' in rawContent) {
    finalContent = (rawContent as TextContentItem).text;
    messageType = MessageType.MESSAGE;
  }
  // Unknown structure, try to stringify
  else if (rawContent) {
    try {
      finalContent = JSON.stringify(rawContent);
    } catch {
      finalContent = "Error: Could not extract content";
    }
    messageType = MessageType.MESSAGE;
  }
  
  // Check for tool calls in the output directly
  if (!toolCalls && output.tool_calls && Array.isArray(output.tool_calls)) {
    toolCalls = output.tool_calls;
    messageType = MessageType.TOOL_CALL;
    console.log(`🔧 Found tool calls directly in tool_calls`);
  }
  
  return { finalContent, toolCalls, messageType };
}

/**
 * Extract content and tool calls from array format
 */
function extractContentFromArray(contentArray: ContentItem[]): {
  finalContent: string;
  toolCalls: ToolCall[] | null;
} {
  const textParts: string[] = [];
  let toolCalls: ToolCall[] | null = null;
  
  for (const item of contentArray) {
    if (item.type === 'text' && 'text' in item) {
      textParts.push(item.text);
    } else if (item.type === 'tool_use' && 'id' in item && 'name' in item) {
      if (!toolCalls) toolCalls = [];
      
      try {
        toolCalls.push({
          id: item.id,
          name: item.name,
          type: item.type,
          args: typeof item.input === 'string' ? JSON.parse(item.input) : item.input as Record<string, unknown>
        });
      } catch {
        toolCalls.push({ 
          id: item.id, 
          name: item.name, 
          args: item.input as unknown as Record<string, unknown>, 
          type: item.type 
        });
      }
    }
  }
  
  const finalContent = textParts.length > 0 ? textParts.join('\n') : "";
  if (finalContent) {
    console.log(`💬 Extracted text content: "${finalContent.substring(0, 100)}${finalContent.length > 100 ? '...' : ''}"`)
  }
  
  return { finalContent, toolCalls };
}

/**
 * Extract tool content from tool output
 */
function extractToolContent(output: ToolOutput | null | undefined): string {
  let toolContent = "";
  
  if (!output) {
    return toolContent;
  }
  
  if (typeof output === 'string') {
    toolContent = output;
  } else if (typeof output === 'object' && output !== null) {
    if (output.content) {
      toolContent = typeof output.content === 'string' 
        ? output.content 
        : JSON.stringify(output.content);
    } else {
      try {
        toolContent = JSON.stringify(output);
      } catch {
        toolContent = `[Complex tool output]`;
      }
    }
  }
  
  return toolContent;
}

/**
 * Process a user message with the agent
 */
export const processMessage = async (
  conversationId: string,
  message: string,
  userId: string,
  newUserMessageId?: string
) => {
  try {
    console.log(`🔄 Processing message for conversation ID: ${conversationId}`);
    
    // Initialize database and get conversation history
    const dbService = await AgentDBService.createForUser(userId);
    const conversationHistory = await dbService.getConversationHistory(conversationId);
    const formattedHistory = formatMessagesForAgent(conversationHistory);
    
    console.log(`📚 Including ${formattedHistory.length} messages from history`);
    
    // Set max listeners to avoid memory leaks
    process.setMaxListeners(20);

    // Stream agent events
    const eventStream = agent.streamEvents(
      { messages: formattedHistory },
      { version: "v2", configurable: { thread_id: conversationId } }
    );

    // Track state
    let userMessageUpdated = false;

    try {
      for await (const event of eventStream) {
        // Handle chat model completion
        if (event.event === EventType.ON_CHAT_MODEL_END) {
          console.log(`💬 Chat model completed`);
          
          // Extract content from output
          const { finalContent, toolCalls, messageType } = extractContentFromOutput(event.data?.output as ModelOutput);
          const usageMetadata = event.data?.output?.usage_metadata || null;
          
          // Log tool calls count if any
          if (toolCalls) {
            console.log(`🔧 Tool calls detected: ${toolCalls.length}`);
          }
          
          console.log(`💬 Extracted content type: ${typeof finalContent}, length: ${finalContent.length}`);
          
          // Verify content extraction
          if (finalContent.trim().startsWith('[') && finalContent.trim().endsWith(']')) {
            console.warn(`⚠️ WARNING: Content still appears to be a JSON array - extraction likely failed`);
          }
          
          // Save to database
          try {
            // Prepare metadata with both tool calls and usage metadata
            const metadata: Record<string, unknown> = {};
            
            if (toolCalls && toolCalls.length > 0) {
              metadata.tool_calls = toolCalls;
            }
            
            if (usageMetadata) {
              metadata.usage_metadata = usageMetadata;
            }
            
            const metadataInfo = [];
            if (metadata.tool_calls) metadataInfo.push(`${(metadata.tool_calls as ToolCall[]).length} tool_calls`);
            if (metadata.usage_metadata) metadataInfo.push('usage_metadata');
            
            console.log(`💾 Saving ${messageType} message with metadata: ${metadataInfo.length > 0 ? metadataInfo.join(', ') : 'none'}`);
            
            await dbService.insertAgentMessage({
              conversation_id: conversationId,
              content: finalContent.trim(),
              sender: SenderType.AGENT,
              status: MessageStatus.COMPLETED,
              message_type: messageType,
              metadata: metadata
            });
            
            // Update user message status for message types
            if (newUserMessageId && !userMessageUpdated) {
              await dbService.updateMessageStatus(newUserMessageId, MessageStatus.RESPONDED);
              userMessageUpdated = true;
            }
          } catch (error) {
            console.error(`❌ Error saving message:`, error);
          }
        }
        
        // Handle tool completion
        else if (event.event === EventType.ON_TOOL_END) {
          const toolName = event.name || 'unknown_tool';
          const toolCallId = event.run_id;
          
          // Extract tool content
          const toolContent = extractToolContent(event.data?.output as ToolOutput);
          
          console.log(`🔧 Tool completed: ${toolName}, output type: ${typeof toolContent}`);
          
          // Save tool result
          if (toolContent) {
            try {
              console.log(`💾 Saving tool result for ${toolName}`);
              
              await dbService.insertAgentMessage({
                conversation_id: conversationId,
                content: toolContent.trim(),
                sender: SenderType.AGENT,
                status: MessageStatus.COMPLETED,
                message_type: MessageType.TOOL_RESULT,
                metadata: {
                  tool_name: toolName,
                  tool_call_id: toolCallId
                }
              });
            } catch (error) {
              console.error(`❌ Error saving tool result:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing event stream:", error);
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing message:", error);
    return { success: false };
  }
}