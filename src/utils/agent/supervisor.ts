import { ChatAnthropic } from "@langchain/anthropic";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { searcherAgent } from "./agents/searcher";
import { editorAgent, runEditorAgent } from "./agents/editor";
import { reviewerAgent, runReviewerAgent } from "./agents/reviewer";
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Create a wrapper for the searcher agent as a tool
const searchTool = tool(
  async (args) => {
    console.log(`🔍 Searching for: "${args.query}"`);
    
    // Invoke the searcher agent
    const result = await searcherAgent.invoke({ 
      messages: [{ role: "user", content: args.query }] 
    });
    
    // Extract the structured response
    const news = result.structuredResponse?.news || [];
    
    return {
      results: news,
      message: `Found ${news.length} relevant results.`
    };
  },
  {
    name: "search",
    description: "Search for information on a topic. Use this for gathering data on news, events, or any factual information.",
    schema: z.object({
      query: z.string().describe("The search query to find information about")
    })
  }
);


// Create the supervisor model
const supervisorModel = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-sonnet-20240620"
});

// Create the supervisor workflow
const supervisorWorkflow = createSupervisor({
  agents: [
    searcherAgent,
    editorAgent,
    reviewerAgent
  ],
  llm: supervisorModel,
  outputMode: "full_history",
  prompt: `
You are a news research supervisor coordinating a team of specialized agents to create comprehensive, accurate news reports.

Your team consists of:
1. SEARCHER: Expert at finding relevant information on any topic
2. EDITOR: Expert at analyzing and formatting information into comprehensive reports
3. REVIEWER: Expert at fact-checking and ensuring reports are accurate and complete

WORKFLOW:
1. First, use the SEARCHER to gather information about the user's query
2. Then, use the EDITOR to analyze the search results and create a comprehensive report
3. Next, use the REVIEWER to check the report for accuracy and completeness
4. If the REVIEWER approves the report, present it to the user
5. If the REVIEWER suggests revisions, use the EDITOR again to improve the report based on the feedback

IMPORTANT GUIDELINES:
- Always maintain a neutral, balanced perspective
- Ensure all information is properly sourced and cited
- Be aware that the current date is ${new Date().toISOString()}
- Format the final report in markdown for readability
- If the report needs multiple revisions, coordinate between the EDITOR and REVIEWER until the report is approved

Your goal is to produce high-quality, factual reports that address the user's query comprehensively.
`
});

// Compile the workflow
export const supervisor = supervisorWorkflow.compile();

/**
 * Process a news query using the supervisor workflow
 * @param query The news query to process
 * @returns The final report and usage metadata
 */
export async function processSupervisedNewsQuery(query: string) {
  console.log(`🚀 Starting supervised news query: "${query}"`);
  
  // Invoke the supervisor
  const result = await supervisor.invoke({
    messages: [
      {
        role: "user",
        content: query
      }
    ]
  });
  
  // Extract the final message (the report)
  const messages = result.messages;
  const finalMessage = messages[messages.length - 1];
  
  // Calculate total token usage
  const usageMetadata = messages
    .reduce((acc, msg) => {
      const metadata = (msg as AIMessage).usage_metadata;
      if (!metadata) return acc;
      
      return {
        input_tokens: (acc.input_tokens || 0) + (metadata.input_tokens || 0),
        output_tokens: (acc.output_tokens || 0) + (metadata.output_tokens || 0),
        total_tokens: (acc.total_tokens || 0) + (metadata.total_tokens || 0),
      };
    }, { input_tokens: 0, output_tokens: 0, total_tokens: 0 });
  
  console.log(`✅ Completed supervised news query with ${messages.length} messages`);
  
  return {
    report: finalMessage.content,
    usageMetadata,
    fullHistory: messages
  };
} 