# News AI Agent

An AI-powered news research assistant that helps you find, analyze and understand current events through natural conversation.

## Features

- **AI-Powered News Research**: Natural language interface to search and analyze news from multiple sources
- **Real-time Chat Interface**: Clean, modern UI for conversing with the AI agent
- **Multiple Search Providers**: Integrates with DuckDuckGo and Tavily for comprehensive news coverage
- **Authentication**: Secure user authentication powered by Supabase
- **Dark/Light Mode**: Comfortable reading experience in any lighting condition

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Supabase for authentication and data storage
- **AI/Search**: 
  - OpenAI for natural language understanding
  - DuckDuckGo and Tavily for news search
  - Real-time updates via Supabase subscriptions

## Setup

1. Clone the repo and install dependencies:
```bash
git clone <repository-url>
cd <project-directory>
npm install
```

2. Configure environment variables in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SITE_URL=http://localhost:3000
```

3. Run the development server:
```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project
2. Enable authentication
3. Set up the following tables:
   - conversations
   - messages
4. Configure row level security policies

## Usage

1. Sign in using Supabase authentication
2. Start a conversation with the AI agent
3. Ask about news topics, current events, or request analysis
4. View search results and AI responses in real-time

## Development

The application uses a modern React architecture with:
- TypeScript for type safety
- Tailwind CSS for styling
- Component-based UI architecture
- Real-time data updates via Supabase

## License

MIT