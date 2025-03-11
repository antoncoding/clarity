-- Add metadata column for storing tool usage and execution details
ALTER TABLE IF EXISTS messages 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add message_type column to distinguish between different AI message types
ALTER TABLE IF EXISTS messages
ADD COLUMN IF NOT EXISTS message_type TEXT CHECK (message_type IN ('message', 'thought', 'tool_call', 'tool_result'));

-- Adding comments for better documentation
COMMENT ON COLUMN messages.metadata IS 'Stores tool usage details, execution steps, and other execution metadata';
COMMENT ON COLUMN messages.message_type IS 'Type of message: "message" (final response), "thought" (intermediate reasoning), "tool_call" (tool invocation), or "tool_result" (tool response)';
