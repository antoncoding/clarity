import { AGENT_MESSAGES, processAgentResponse, extractMessageContent } from "./utils";
import { agent } from "./llm";
// import { supervisor } from "./supervisor";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { AgentDBService } from "./db";
import { createAdminClient } from "../supabase/admin";

// Re-export for backward compatibility
export { AGENT_MESSAGES } from "./utils";

export type RawMessage = {
  id: string[] | string,
  kwargs: {
    content: string | string[] | Array<{type: string, text?: string, id?: string, name?: string, input?: any}>,
    additional_kwargs?: any,
    response_metadata?: any,
    tool_calls?: Array<{name: string, args?: any, arguments?: string, id: string, type?: string}>,
    tool_call_id?: string,
    usage_metadata?: any,
    name?: string,
    id?: string,
    invalid_tool_calls?: Array<string>
  },
  lc: number,
  type: string,
}

/**
 * Format conversation history into prompt-friendly format
 */
function formatMessagesForAgent(messages: Array<{
  sender: string;
  content: string;
  message_type?: string;
}>) {

  // We want to
  // 1. Remove all tool_call type, (intermediate messages like "Let me think about this")
  // 2. Remove all tool results that were too old
  const filteredMessages = messages.filter(msg => msg.message_type !== "tool_call")

  // Remove tool_result that not the last 8 messages
  const LOOKBACK = 8;
  const length = filteredMessages.length;
  const relevantMessages = filteredMessages
    .filter((msg, idx) => {
      return msg.message_type !== "tool_result" || idx >= length - LOOKBACK
    })

  return relevantMessages.map(msg => ({
    role: msg.sender === "user" ? "user" : "assistant",
    content: msg.content
  }));
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
        // Log only event type and essential info
        
        // Handle chat model completion
        if (event.event === "on_chat_model_end") {
          console.log(`💬 Chat model completed`);
          
          // Extract content directly from the output
          let finalContent = "";
          let toolCalls: Array<{id: string, name: string, args: any, type?: string}> | null = null;
          let usageMetadata = null;
          let messageType = 'thought';
          
          // Extract usage metadata if available
          if (event.data?.output?.usage_metadata) {
            usageMetadata = event.data.output.usage_metadata;
            console.log(`💬 Found usage metadata!`);
          }
          
          if (event.data?.output?.content) {
            const rawContent = event.data.output.content;
            console.log(`💬 Raw content type: ${typeof rawContent}`);
            
            // Handle different content types
            if (typeof rawContent === 'string') {
              // Check if the string is actually a JSON array
              if (rawContent.trim().startsWith('[') && rawContent.trim().endsWith(']')) {
                try {
                  console.log(`💬 Detected JSON array in string, parsing...`);
                  const parsedContent = JSON.parse(rawContent);
                  
                  if (Array.isArray(parsedContent)) {
                    const textParts = [];
                    
                    for (const item of parsedContent) {
                      if (item.type === 'text' && item.text) {
                        textParts.push(item.text);
                      } else if (item.type === 'tool_use') {
                        if (!toolCalls) toolCalls = [];
                        
                        try {
                          toolCalls.push({
                            id: item.id,
                            name: item.name,
                            type: item.type,
                            args: typeof item.input === 'string' ? JSON.parse(item.input) : item.input
                          });
                        } catch (e) {
                          toolCalls.push({ id: item.id, name: item.name, args: item.input, type: item.type });
                        }
                      }
                    }
                    
                    if (textParts.length > 0) {
                      finalContent = textParts.join('\n');
                      console.log(`💬 Extracted text content: "${finalContent.substring(0, 100)}${finalContent.length > 100 ? '...' : ''}"`)
                    }
                  } else {
                    // Not an array after parsing, use as is
                    finalContent = rawContent;
                  }
                } catch (e) {
                  console.log(`💬 Error parsing JSON: ${e}, using raw content`);
                  finalContent = rawContent;
                }
              } else {
                // Not JSON, use as is
                finalContent = rawContent;
              }
              
              messageType = toolCalls && toolCalls.length > 0 ? 'tool_call' : 'message';
            }
            // Handle array content directly
            else if (Array.isArray(rawContent)) {
              console.log(`💬 Content is direct array with ${rawContent.length} items`);
              
              // Extract text parts and tool calls
              const textParts = [];
              
              for (const item of rawContent) {
                if (item.type === 'text' && item.text) {
                  textParts.push(item.text);
                } else if (item.type === 'tool_use') {
                  if (!toolCalls) toolCalls = [];
                  
                  try {
                    toolCalls.push({
                      id: item.id,
                      name: item.name,
                      type: item.type,
                      args: typeof item.input === 'string' ? JSON.parse(item.input) : item.input
                    });
                  } catch (e) {
                    toolCalls.push({ id: item.id, name: item.name, args: item.input, type: item.type });
                  }
                }
              }
              
              // Join text parts
              if (textParts.length > 0) {
                finalContent = textParts.join('\n');
                console.log(`💬 Extracted text content: "${finalContent.substring(0, 100)}${finalContent.length > 100 ? '...' : ''}"`)
              }
              
              // Set message type based on tool calls
              messageType = toolCalls && toolCalls.length > 0 ? 'tool_call' : 'message';
            }
            // If it's an object with text property, use that
            else if (typeof rawContent === 'object' && rawContent !== null && rawContent.text) {
              finalContent = rawContent.text;
              messageType = 'message';
            }
            // Unknown structure, try to stringify
            else if (rawContent) {
              try {
                finalContent = JSON.stringify(rawContent);
              } catch (e) {
                finalContent = "Error: Could not extract content";
              }
              messageType = 'message';
            }
          } else if (event.data?.output?.content) {
            // Alternative path for content
            const outputContent = event.data.output.content;
              try {
                finalContent = JSON.stringify(outputContent);
              } catch (e) {
                finalContent = outputContent;
              }
            messageType = 'message';
          }
          
          // Check for tool calls in the output directly
          if (!toolCalls && event.data?.output?.tool_calls && Array.isArray(event.data.output.tool_calls)) {
            toolCalls = event.data.output.tool_calls;
            messageType = 'tool_call';
            console.log(`🔧 Found tool calls directly in tool_calls`);
          }
          
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
            const metadata: Record<string, any> = {};
            
            if (toolCalls && toolCalls.length > 0) {
              metadata.tool_calls = toolCalls;
            }
            
            if (usageMetadata) {
              metadata.usage_metadata = usageMetadata;
            }
            
            let metadataInfo = [];
            if (metadata.tool_calls) metadataInfo.push(`${metadata.tool_calls.length} tool_calls`);
            if (metadata.usage_metadata) metadataInfo.push('usage_metadata');
            
            console.log(`💾 Saving ${messageType} message with metadata: ${metadataInfo.length > 0 ? metadataInfo.join(', ') : 'none'}`);
            
            await dbService.insertAgentMessage({
              conversation_id: conversationId,
              content: finalContent.trim(),
              sender: "agent",
              status: "completed",
              message_type: messageType,
              metadata: metadata
            });
            
            // Update user message status for message types
            if (newUserMessageId && !userMessageUpdated) {
              await dbService.updateMessageStatus(newUserMessageId, "responded");
              userMessageUpdated = true;
            }
          } catch (error) {
            console.error(`❌ Error saving message:`, error);
          }
        }
        
        // Handle tool completion
        else if (event.event === "on_tool_end") {
          const toolName = event.name || 'unknown_tool';
          const toolCallId = event.run_id;
          
          // Log tool output type info
          if (event.data?.output) {
            console.log(`🔧 Tool output type: ${typeof event.data.output}`);
            if (typeof event.data.output === 'object' && event.data.output !== null) {
              console.log(`🔧 Tool output keys: ${Object.keys(event.data.output).join(', ')}`);
              if (event.data.output.constructor) {
                console.log(`🔧 Tool output constructor: ${event.data.output.constructor.name}`);
              }
            }
          }
          
          // Extract tool content
          let toolContent = "";
          if (event.data?.output) {
            if (typeof event.data.output === 'string') {
              toolContent = event.data.output;
            } else if (typeof event.data.output === 'object' && event.data.output !== null) {
              if (event.data.output.content) {
                toolContent = typeof event.data.output.content === 'string' 
                  ? event.data.output.content 
                  : JSON.stringify(event.data.output.content);
              } else if (event.data.output.content) {
                toolContent = typeof event.data.output.content === 'string' 
                  ? event.data.output.content 
                  : JSON.stringify(event.data.output.content);
              } else {
                try {
                  toolContent = JSON.stringify(event.data.output);
                } catch (e) {
                  toolContent = `[Complex tool output]`;
                }
              }
            }
          }
          
          console.log(`🔧 Tool completed: ${toolName}, output type: ${typeof toolContent}`);
          
          // Save tool result
          if (toolContent) {
            try {
              console.log(`💾 Saving tool result for ${toolName}`);
              
              await dbService.insertAgentMessage({
                conversation_id: conversationId,
                content: toolContent.trim(),
                sender: "agent",
                status: "completed",
                message_type: "tool_result",
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