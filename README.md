# News AI Agent

An open-source AI-powered news research assistant that helps you find, analyze, and understand current events through natural conversation.

## Features

- **Tailored News AI Agent**: Specialized for comprehensive news search and analysis
- **Multi-source Research**: Automatically searches across diverse news sources
- **Contextual Analysis**: Breaks down complex news topics with nuanced perspectives
- **Real-time Chat Interface**: Clean, modern UI for conversing with the AI agent
- **Authentication**: Secure user authentication with Magic Link via Supabase

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Supabase for authentication and data storage
- **AI/Search**: LangChain, OpenAI, and multiple search providers

## Complete Setup Guide

### 1. Clone and Install

```bash
git clone <repository-url>
cd <project-directory>
pnpm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Set up the required database tables:

```sql
-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their conversations" 
  ON messages FOR SELECT 
  USING (conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert messages in their conversations" 
  ON messages FOR INSERT 
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  ));
```

3. Configure Authentication:
   - Go to Authentication → Providers
   - Enable Email provider and check "Enable magic links"

4. Configure Email Templates:
   - Go to Authentication → Email Templates
   - Edit the "Magic Link" template
   - Update the template with:

```html
<h2>Magic Link</h2>

<p>Follow this link to login:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Log In</a></p>
```

### 3. Environment Variables

Create a `.env.local` file with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (important for Magic Link authentication)
SITE_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Additional search providers
TAVILY_API_KEY=your-tavily-api-key
```

### 4. Run the Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` to see your application.

### 5. Production Deployment

When deploying to production:

1. Update the `SITE_URL` to your production URL
2. Configure the same environment variables on your hosting platform
3. Update the Supabase project settings to allow your production domain

## Usage

1. Sign in using the Magic Link authentication
2. Start a new conversation with the AI agent
3. Ask about news topics, current events, or request analysis
4. The agent will search multiple sources and provide comprehensive analysis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT