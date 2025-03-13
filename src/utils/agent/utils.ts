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
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

// Constants
export const AGENT_MESSAGES = {
  ERROR: "I encountered an error while processing your request. Please try again."
};

// Token pricing in USD per 1M tokens for Claude models
export const TOKEN_PRICING = {
  // Claude 3.5 Haiku
  'claude-3-5-haiku-latest': {
    INPUT: 0.80,  // $0.80 per 1M input tokens
    OUTPUT: 4.00  // $4.00 per 1M output tokens
  },
  // Claude 3.5 Sonnet
  'claude-3-5-sonnet-latest': {
    INPUT: 3.00,  // $3.00 per 1M input tokens
    OUTPUT: 15.00  // $15.00 per 1M output tokens
  }
};

// Get currently used model from the llm configuration
const DEFAULT_MODEL = 'claude-3-5-haiku-latest';

/**
 * Calculate cost based on token usage and model
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const pricing = TOKEN_PRICING[DEFAULT_MODEL];
  
  const inputCost = (inputTokens / 1000000) * pricing.INPUT;
  const outputCost = (outputTokens / 1000000) * pricing.OUTPUT;
  
  return parseFloat((inputCost + outputCost).toFixed(6));
}

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
        console.log("AI message whole", msg)

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
  if (!messages) {
    return {
      response: AGENT_MESSAGES.ERROR,
      messages: [],
      input_tokens: 0,
      output_tokens: 0,
      cost: 0
    };
  }
  
  const processedMessages = parseAgentMessages(messages);
  
  // The final response is the last message of type 'message'
  const finalResponse = processedMessages
    .filter((msg) => msg.type === 'message')
    .pop()?.content || AGENT_MESSAGES.ERROR;
  
  // Calculate token usage from message metadata
  let inputTokens = 0;
  let outputTokens = 0;
  
  processedMessages.forEach(msg => {
    if (msg.metadata?.usage_metadata) {
      inputTokens += msg.metadata.usage_metadata.input_tokens || 0;
      outputTokens += msg.metadata.usage_metadata.output_tokens || 0;
    }
  });
  
  // Calculate cost based on token usage
  const cost = calculateCost(inputTokens, outputTokens);
  
  return {
    response: finalResponse,
    messages: processedMessages,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost
  };
}