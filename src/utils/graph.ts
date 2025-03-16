import { StateGraph, END, START } from "@langchain/langgraph";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { searcherAgent } from "./agent/agents/searcher";
import { runEditorAgent } from "./agent/agents/editor";
import { runReviewerAgent } from "./agent/agents/reviewer";

// Define the state for our graph
const NewsState = Annotation.Root({
  // Messages passed between nodes
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  // Search results from the searcher agent
  searchResults: Annotation<{title: string, url: string, content: string}[]>({
    default: () => [],
    reducer: (x, y) => y || x,
  }),
  // Current step in the workflow
  currentStep: Annotation<string>({
    default: () => "search",
    reducer: (x, y) => y || x,
  }),
  // Query that was searched for
  query: Annotation<string>({
    default: () => "",
    reducer: (x, y) => y || x,
  }),
  // Metadata for tracking token usage
  usageMetadata: Annotation<any>({
    default: () => ({}),
    reducer: (x, y) => ({
      input_tokens: (x?.input_tokens || 0) + (y?.input_tokens || 0),
      output_tokens: (x?.output_tokens || 0) + (y?.output_tokens || 0),
      total_tokens: (x?.total_tokens || 0) + (y?.total_tokens || 0),
    }),
  }),
});

// Step 1: Searcher Node - Uses the searcher agent to get data
async function searcherNode(state: typeof NewsState.State) {
  const query = state.messages[state.messages.length - 1].content as string;
  
  console.log(`🔍 Starting search for: "${query}"`);
  
  // Invoke the searcher agent
  const result = await searcherAgent.invoke({ 
    messages: [{ role: "user", content: query }] 
  });
  
  // Extract the structured response
  const news = result.structuredResponse?.news || [];
  
  // Extract usage metadata
  const usage_metadata = result.messages
    .filter((message) => message instanceof AIMessage)
    .map((message) => message.usage_metadata)
    .filter(Boolean)
    .reduce((acc, metadata) => {
      if (!metadata) return acc;
      return {
        input_tokens: (acc?.input_tokens || 0) + (metadata.input_tokens || 0),
        output_tokens: (acc?.output_tokens || 0) + (metadata.output_tokens || 0),
        total_tokens: (acc?.total_tokens || 0) + (metadata.total_tokens || 0),
      };
    }, {input_tokens: 0, output_tokens: 0, total_tokens: 0}) || {};
  
  console.log(`✅ Search completed with ${news.length} results`);
  
  // Return updated state
  return {
    searchResults: news,
    currentStep: "analyze",
    query: query,
    usageMetadata: usage_metadata,
    messages: [
      new AIMessage({
        content: `Search completed with ${news.length} results. Moving to analysis phase.`,
      }),
    ],
  };
}

// Step 2: Editor Node - Analyzes and formats the search results
async function editorNode(state: typeof NewsState.State) {
  const searchResults = state.searchResults;
  const query = state.query;
  
  // Use the editor agent
  const editorResult = await runEditorAgent(query, searchResults);
  
  // Return updated state
  return {
    currentStep: "review",
    usageMetadata: editorResult.usage_metadata,
    messages: [
      new AIMessage({
        content: editorResult.content,
      }),
    ],
  };
}

// Step 3: Reviewer Node - Reviews the final report
async function reviewerNode(state: typeof NewsState.State) {
  const editorReport = state.messages[state.messages.length - 1].content;
  const searchResults = state.searchResults;
  const query = state.query;
  
  // Use the reviewer agent
  const reviewerResult = await runReviewerAgent(query, searchResults, editorReport as string);
  
  // Return updated state
  return {
    currentStep: "complete",
    usageMetadata: reviewerResult.usage_metadata,
    messages: [
      new AIMessage({
        content: reviewerResult.content,
      }),
    ],
  };
}

// Define the router function to determine the next step
function router(state: typeof NewsState.State) {
  const currentStep = state.currentStep;
  
  if (currentStep === "search") {
    return "editor";
  } else if (currentStep === "analyze") {
    return "reviewer";
  } else if (currentStep === "review") {
    return "end";
  } else {
    return "end";
  }
}

// Create and compile the graph
export function createNewsGraph() {
  const workflow = new StateGraph(NewsState)
    .addNode("searcher", searcherNode)
    .addNode("editor", editorNode)
    .addNode("reviewer", reviewerNode);

  // Define the edges
  workflow.addEdge(START, "searcher");
  workflow.addConditionalEdges("searcher", router, {
    editor: "editor",
    reviewer: "reviewer",
    end: END,
  });
  
  workflow.addConditionalEdges("editor", router, {
    editor: "editor",
    reviewer: "reviewer",
    end: END,
  });
  
  workflow.addConditionalEdges("reviewer", router, {
    editor: "editor",
    reviewer: "reviewer",
    end: END,
  });

  return workflow.compile();
}

// Function to run the graph with a query
export async function processNewsQuery(query: string) {
  const graph = createNewsGraph();
  
  const result = await graph.invoke({
    messages: [new HumanMessage(query)],
    currentStep: "search",
  });
  
  // Extract the final report (last message)
  const finalReport = result.messages[result.messages.length - 1].content;
  const usageMetadata = result.usageMetadata;
  
  return {
    report: finalReport,
    usageMetadata,
  };
}
