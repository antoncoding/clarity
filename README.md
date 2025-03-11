# News Agent - Interactive News Chat Interface

A modern, real-time news agent chat interface built with Next.js and Supabase.

## Features

- **Simple Chat Interface**: Clean, focused UI for interacting with the news agent
- **Real-time Updates**: Messages update instantly using Supabase's real-time capabilities
- **Asynchronous Processing**: Backend worker processes news requests without blocking the UI
- **Markdown Support**: Rich text responses with formatting for better readability
- **Dark/Light Mode**: Toggle between themes with the sidebar option
- **Collapsible Sidebar**: Minimal UI with collapsible sidebar for settings

## Architecture

This application uses a modern, real-time architecture:

1. **Frontend**: 
   - React/Next.js for the UI
   - Tailwind CSS for styling
   - Real-time subscriptions to Supabase for instant updates

2. **Backend**:
   - Next.js API routes for handling requests
   - Asynchronous processing of news queries
   - Supabase for data storage and real-time updates

3. **Database**:
   - Conversations table: Stores chat conversations
   - Messages table: Stores individual messages with status
   - News Requests table: Tracks background processing tasks

4. **Real-time Flow**:
   1. User sends a message
   2. Message is stored in Supabase
   3. Backend worker processes the request asynchronously
   4. Results are written back to Supabase
   5. UI updates in real-time via Supabase subscriptions

## Setup

1. First clone the repo locally
2. Make sure you `cd` into the directory
3. Run the following command to install dependencies 
```
npm install
```
4. Create a `.env` file at the root of the project with:
```
NEXT_PUBLIC_SUPABASE_URL=your-projects-url-from-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SITE_URL=http://localhost:3000
```
5. Set up your Supabase database with the required tables:
   - Run the migration in `supabase/migrations/20250311_news_agent_schema.sql`
   - Or manually create the tables as described in the file

6. Run the development server:
```
npm run dev
```

## Supabase Configuration

1. Create your Supabase account and project
2. Set up authentication (Email, Magic Link, etc.)
3. Enable real-time functionality for the tables:
   - conversations
   - messages
   - news_requests
4. Set up Row Level Security policies as defined in the migration file

## Usage

1. Open the application in your browser
2. Start chatting with the news agent
3. Ask about current events, specific topics, or news analysis
4. The agent will process your request and respond with relevant news information

## Technologies Used

- Next.js
- React
- Supabase
- Tailwind CSS
- TypeScript