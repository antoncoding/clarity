import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';

// Types for agent message processing
export interface AgentMessage {
  type: 'message' | 'thought' | 'tool_call' | 'tool_result';
  content: string;
  metadata: Record<string, any>;
}

export interface ParsedAgentResponse {
  response: string;
  messages: AgentMessage[];
}

// Constants
export const AGENT_MESSAGES = {
  ERROR: "I encountered an error while processing your request. Please try again."
};

/**
 * Extract content from a message, handling different content formats
 */
export function extractMessageContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    return content.find((c: any) => c.type === 'text')?.text || JSON.stringify(content);
  } else {
    return JSON.stringify(content);
  }
}

/**
 * Parse raw agent messages into structured format
 * This function finds the last user message and extracts only relevant messages after it,
 * then categorizes them into different types (message, thought, tool_call, tool_result)
 */
export function parseAgentMessages(rawMessages: (AIMessage | HumanMessage | ToolMessage)[]): AgentMessage[] {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    console.log('not array')
    return [];
  }

  // Find the index of the last user message
  const userMessageIndex = rawMessages
    .map((msg: any, index: number) => ({ 
      type: msg instanceof HumanMessage ? 'human' : 'other',
      index 
    }))
    .filter((msg: any) => msg.type === 'human')
    .pop()?.index || -1;

  // Extract only messages that came after the last user message
  const relevantMessages = rawMessages.slice(userMessageIndex + 1);

  // Find the last AI message that doesn't have tool calls
  const aiMessages = relevantMessages.filter(msg => msg instanceof AIMessage);
  const lastAiMessageIndex = aiMessages.length - 1;
  
  // Categorize messages
  return relevantMessages
    .map((msg: any) => {
      // Skip any human messages
      if (msg instanceof HumanMessage) {
        return null;
      }
      
      // Handle AI messages
      if (msg instanceof AIMessage) {
        // Get the content, handling both string and array formats
        const content = extractMessageContent(msg.content);
        
        // Skip temporary processing messages
        if (content === AGENT_MESSAGES.ERROR || content === "Processing your message...") {
          return null;
        }
        
        const hasToolCalls = msg.tool_calls?.length ?? 0 > 0;
        const isLastAiMessage = aiMessages.indexOf(msg) === lastAiMessageIndex;
        
        // If it has tool calls, it's a tool call message
        if (hasToolCalls) {
          return {
            type: 'tool_call' as const,
            content: extractMessageContent(msg.content),
            metadata: {
              tool_calls: msg.tool_calls,
              usage_metadata: msg.usage_metadata
            }
          };
        }
        
        // If it's the last AI message without tool calls, it's the final response
        if (isLastAiMessage && !hasToolCalls) {
          return {
            type: 'message' as const,
            content: extractMessageContent(msg.content),
            metadata: {
              usage_metadata: msg.usage_metadata
            }
          };
        }
        
        // Otherwise it's a thought
        return {
          type: 'thought' as const,
          content: extractMessageContent(msg.content),
          metadata: {
            usage_metadata: msg.usage_metadata
          }
        };
      }
      
      // Tool messages contain tool results
      if (msg instanceof ToolMessage) {
        return {
          type: 'tool_result' as const,
          content: msg.content as string,
          metadata: {
            tool_call_id: msg.tool_call_id,
            name: msg.name
          }
        };
      }
      
      return null;
    })
    .filter(Boolean) as AgentMessage[];
}

/**
 * Process agent response to extract final response and structured messages
 */
export function processAgentResponse(messages: (HumanMessage | AIMessage | ToolMessage)[]): ParsedAgentResponse {

  console.log('messages is array', Array.isArray(messages), messages.length)

  if (!messages) {
    return {
      response: AGENT_MESSAGES.ERROR,
      messages: []
    };
  }
  
  const processedMessages = parseAgentMessages(messages);
  console.log('processedMessages in process agent response', processedMessages.length)
  
  // The final response is the last message of type 'message'
  const finalResponse = processedMessages
    .filter((msg) => msg.type === 'message')
    .pop()?.content || AGENT_MESSAGES.ERROR;
  
  return {
    response: finalResponse,
    messages: processedMessages
  };
}