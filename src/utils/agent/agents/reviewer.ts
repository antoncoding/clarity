import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const reviewerModel = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});

// Create the reviewer agent as a React agent
export const reviewerAgent = createReactAgent({
  llm: reviewerModel,
  tools: [],
  name: "reviewer_agent",
  prompt: `
You are a fact-checking reviewer. Current date and time is ${new Date().toISOString()}.

Your job is to review reports and ensure:
1. All information is accurate and properly sourced
2. The report addresses the original query comprehensively
3. Time-sensitive information is current and relevant -- You need to ask the editor to remove irrelvant parts if it's outdated
4. Sources are properly cited and linked
5. The report is balanced and neutral

If the report meets all criteria, respond with "APPROVED" followed by a brief explanation.
If the report needs improvement, respond with "NEEDS REVISION" followed by specific issues that need to be addressed.

Your response should be in markdown format.
`
});

/**
 * Function to use the reviewer agent directly
 * @param query The original search query
 * @param searchResults The search results used for the report
 * @param editorReport The report to review
 * @returns The reviewer's assessment
 */
export async function runReviewerAgent(
  query: string,
  searchResults: {title: string, url: string, content: string}[],
  editorReport: string
) {
  console.log("🔍 Starting review phase");
  
  // Create a prompt for the reviewer
  const reviewerPrompt = `
ORIGINAL QUERY: "${query}"

SEARCH RESULTS:
${JSON.stringify(searchResults.slice(0, 2), null, 2)}
... (${searchResults.length - 2} more results)

EDITOR'S REPORT:
${editorReport}

Please review this report following the guidelines in your instructions.
`;

  // Invoke the reviewer model
  const reviewerResponse = await reviewerModel.invoke([
    new HumanMessage(reviewerPrompt)
  ]);
  
  console.log("✅ Review completed");
  
  return {
    content: reviewerResponse.content,
    usage_metadata: reviewerResponse.usage_metadata || {}
  };
}

// Create a wrapper for the reviewer agent as a tool with a more specific name
export const reportReviewTool = tool(
  async (args) => {
    console.log(`🔍 Reviewing report for: "${args.query}"`);
    
    // Use the reviewer agent
    const result = await runReviewerAgent(args.query, args.searchResults, args.report);
    
    // Check if the report was approved or needs revision
    const isApproved = (result.content as string).includes("APPROVED");
    
    return {
      feedback: result.content,
      approved: isApproved,
      message: isApproved ? "Report has been approved." : "Report needs revision."
    };
  },
  {
    name: "review_report",
    description: "Review a report for accuracy and completeness. Use this to ensure the report is factual and addresses the original query.",
    schema: z.object({
      query: z.string().describe("The original query that was searched for"),
      searchResults: z.array(z.object({
        title: z.string(),
        url: z.string(),
        content: z.string()
      })).describe("The search results used for the report"),
      report: z.string().describe("The report to review")
    })
  }
); 