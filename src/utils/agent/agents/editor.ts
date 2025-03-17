import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const editorModel = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});

// Create the editor agent as a React agent
export const editorAgent = createReactAgent({
  llm: editorModel,
  tools: [],
  name: "editor_agent",
  prompt: `
You are an expert news editor and analyst. Current date and time is ${new Date().toISOString()}.

Your job is to analyze search results and create comprehensive reports that:
1. Filter out time-sensitive information that is outdated
2. Break down each news source and identify any underlying biases
3. Highlight the common "truths" shared across different sources
4. Clearly separate facts from arguments or opinions
5. Present a balanced view from different perspectives

FORMAT REQUIREMENTS:
- Use markdown formatting for readability
- Include proper citations for all information
- For each key point, include a reference to the source in the format [Source](URL)
- Organize the content with clear headings and structure
- Conclude with a summary of the most important verified information

Remember to maintain neutrality and focus on providing factual information.
`
});

/**
 * Function to use the editor agent directly
 * @param query The original search query
 * @param searchResults The search results to analyze
 * @returns The editor's analysis and report
 */
export async function runEditorAgent(
  query: string, 
  searchResults: {title: string, url: string, content: string}[]
) {
  console.log("📝 Starting analysis and editing phase");
  
  // Create a prompt for the editor
  const editorPrompt = `
SEARCH QUERY: "${query}"

SEARCH RESULTS:
${JSON.stringify(searchResults, null, 2)}

Please analyze these search results and create a comprehensive report following the guidelines in your instructions.
`;

  // Invoke the editor model
  const editorResponse = await editorModel.invoke([
    new HumanMessage(editorPrompt)
  ]);
  
  console.log("✅ Analysis and editing completed");
  
  return {
    content: editorResponse.content,
    usage_metadata: editorResponse.usage_metadata || {}
  };
}

// Create a wrapper for the editor agent as a tool with a more specific name
export const editorAnalysisTool = tool(
  async (args) => {
    console.log(`📝 Editing report for: "${args.query}"`);
    
    // Use the editor agent
    const result = await runEditorAgent(args.query, args.searchResults);
    
    return {
      report: result.content,
      message: "Report has been created based on the search results."
    };
  },
  {
    name: "analyze_and_create_report",
    description: "Create a comprehensive report from search results. Use this to analyze and format information into a coherent report.",
    schema: z.object({
      query: z.string().describe("The original query that was searched for"),
      searchResults: z.array(z.object({
        title: z.string(),
        url: z.string(),
        content: z.string()
      })).describe("The search results to analyze")
    })
  }
); 