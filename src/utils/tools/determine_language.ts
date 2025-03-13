import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";


const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-haiku-latest"
});

const LanguageDeterminePrompt = `
You need to determine the users's core intent and what they want to search for, and return the most useful search language & key words, regardless of the input language.
You can return multiple languages if you believe that would result in a better search result.

For example: 
* If the user message is about recent news in Taiwan, you should return {language: ["繁體中文"]}
* If the user message is like "法國 政治", you should return {language: ["France"]}
* If the user wants to learn "technology de Japón", you should return {language: ["日本語"]}
* If the query is about particular people like "Trump and Luka Doncic", you should return [language: ["English", "slovenski"]]

Simply return the language in JSON format.
`

export const determineLanguage = tool(async ({ userMessage }) => {
  const response = await model.invoke([
    new SystemMessage(LanguageDeterminePrompt),
    new HumanMessage(userMessage),
  ]);

  console.log(`🔍 Determine Language: ${response.content}`);

  return {
    content: response.content,
    usage_metadata: response.usage_metadata
  };
  
}, {
  name: "determine_search_language",
  description: "Call to determine the most useful search language for the query.",
  schema: z.object({
    userMessage: z.string().describe("User message"),
  }),
});