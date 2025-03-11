import { RawMessage } from './index'

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
export function parseAgentMessages(rawMessages: RawMessage[]): AgentMessage[] {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return [];
  }

  // Find the index of the last user message
  const userMessageIndex = rawMessages
    .map((msg: any, index: number) => ({ 
      type: msg.type, 
      id: msg.id,
      index 
    }))
    .filter((msg: any) => msg.type === 'constructor' && msg.id.includes('HumanMessage'))
    .pop()?.index || 0;

  // Extract only messages that came after the last user message
  const relevantMessages = rawMessages.slice(userMessageIndex + 1);
  
  // Categorize messages
  return relevantMessages
    .map((msg: any) => {
      // Skip any non-constructor messages or human messages
      if (msg.type !== 'constructor' || msg.id.includes('HumanMessage')) {
        return null;
      }
      
      // Handle AI messages
      if (msg.id.includes('AIMessage')) {
        // Get the content, handling both string and array formats
        const content = extractMessageContent(msg.kwargs.content);
        
        // Skip temporary processing messages
        if (content === AGENT_MESSAGES.ERROR || content === "Processing your message...") {
          return null;
        }
        
        // Get all AI messages that are not processing messages
        const nonProcessingAIMessages = relevantMessages.filter((m: any) => 
          m.id.includes('AIMessage') && 
          extractMessageContent(m.kwargs.content) !== "Processing your message..." &&
          extractMessageContent(m.kwargs.content) !== AGENT_MESSAGES.ERROR
        );
        
        // The last message is the final response
        const isLastMessage = nonProcessingAIMessages.indexOf(msg) === nonProcessingAIMessages.length - 1;
        const hasToolCalls = msg.kwargs?.tool_calls?.length > 0;
        
        // If it has tool calls, it's a tool call message
        if (hasToolCalls) {
          return {
            type: 'tool_call' as const,
            content: extractMessageContent(msg.kwargs.content),
            metadata: {
              tool_calls: msg.kwargs.tool_calls,
              usage_metadata: msg.kwargs.usage_metadata
            }
          };
        }
        
        // If it's the last message, it's the final response
        if (isLastMessage) {
          return {
            type: 'message' as const,
            content: extractMessageContent(msg.kwargs.content),
            metadata: {
              usage_metadata: msg.kwargs.usage_metadata
            }
          };
        }
        
        // Otherwise it's a thought
        return {
          type: 'thought' as const,
          content: extractMessageContent(msg.kwargs.content),
          metadata: {
            usage_metadata: msg.kwargs.usage_metadata
          }
        };
      }
      
      // Tool messages contain tool results
      if (msg.id.includes('ToolMessage')) {
        return {
          type: 'tool_result' as const,
          content: msg.kwargs.content,
          metadata: {
            tool_call_id: msg.kwargs.tool_call_id,
            name: msg.kwargs.name
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
export function processAgentResponse(messages: RawMessage[]): ParsedAgentResponse {
  if (!messages) {
    return {
      response: AGENT_MESSAGES.ERROR,
      messages: []
    };
  }
  
  const processedMessages = parseAgentMessages(messages);
  
  // The final response is the last message of type 'message'
  const finalResponse = processedMessages
    .filter((msg) => msg.type === 'message')
    .pop()?.content || AGENT_MESSAGES.ERROR;
  
  return {
    response: finalResponse,
    messages: processedMessages
  };
}