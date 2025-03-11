import { parseAgentMessages, processAgentResponse, AGENT_MESSAGES } from '../utils';
import { RawMessage } from '../index';

// Helper function to create properly typed mock messages
function createMockMessage(
  idParts: string[], 
  content: string | string[] | Array<{type: string, text?: string, id?: string, name?: string, input?: any}>, 
  type: string = 'constructor',
  additionalProps: Partial<RawMessage['kwargs']> = {}
): RawMessage {
  return {
    lc: 1,
    type,
    id: idParts,
    kwargs: {
      content,
      ...additionalProps
    }
  };
}

describe('parseAgentMessages', () => {
  it('should handle empty messages array', () => {
    const result = parseAgentMessages([]);
    expect(result).toEqual([]);
  });

  it('should handle null or undefined input', () => {
    // @ts-ignore - Testing with invalid input
    const result1 = parseAgentMessages(null);
    // @ts-ignore - Testing with invalid input
    const result2 = parseAgentMessages(undefined);
    
    expect(result1).toEqual([]);
    expect(result2).toEqual([]);
  });

  it('should find the last user message and extract relevant messages', () => {
    const mockMessages: RawMessage[] = [
      createMockMessage(['langchain_core', 'messages', 'HumanMessage'], 'User message 1'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'AI response 1'),
      createMockMessage(['langchain_core', 'messages', 'HumanMessage'], 'User message 2'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'AI thought'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'AI final response')
    ];

    const result = parseAgentMessages(mockMessages);
    
    // Should only include messages after the last HumanMessage
    expect(result.length).toBe(2);
    expect(result[0].content).toBe('AI thought');
    expect(result[1].content).toBe('AI final response');
  });

  it('should categorize AI messages as thought or message', () => {
    const mockMessages: RawMessage[] = [
      createMockMessage(['langchain_core', 'messages', 'HumanMessage'], 'User message'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'AI thinking...'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'Final response')
    ];

    const result = parseAgentMessages(mockMessages);
    
    expect(result.length).toBe(2);
    expect(result[0].type).toBe('thought');
    expect(result[1].type).toBe('message');
  });

  it('should identify tool calls correctly', () => {
    const mockMessages: RawMessage[] = [
      createMockMessage(['langchain_core', 'messages', 'HumanMessage'], 'User message'),
      createMockMessage(
        ['langchain_core', 'messages', 'AIMessage'], 
        'I will search for that', 
        'constructor',
        { tool_calls: [{ name: 'search', arguments: '{"query": "test"}', id: 'test-id', type: 'tool_call' }] }
      ),
      createMockMessage(
        ['langchain_core', 'messages', 'ToolMessage'], 
        'Search results', 
        'constructor',
        { tool_call_id: '123', name: 'search' }
      ),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'Final response')
    ];

    const result = parseAgentMessages(mockMessages);
    
    expect(result.length).toBe(3);
    expect(result[0].type).toBe('tool_call');
    expect(result[0].metadata.tool_calls).toEqual([{ name: 'search', arguments: '{"query": "test"}', id: 'test-id', type: 'tool_call' }]);
    
    expect(result[1].type).toBe('tool_result');
    expect(result[1].content).toBe('Search results');
    expect(result[1].metadata.name).toBe('search');
    
    expect(result[2].type).toBe('message');
    expect(result[2].content).toBe('Final response');
  });

  it('should skip processing messages', () => {
    const mockMessages: RawMessage[] = [
      createMockMessage(['langchain_core', 'messages', 'HumanMessage'], 'User message'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'Processing your message...'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], AGENT_MESSAGES.ERROR),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'Real response')
    ];

    const result = parseAgentMessages(mockMessages);
    
    // Should skip the processing messages
    expect(result.length).toBe(1);
    expect(result[0].content).toBe('Real response');
  });

  // Test with real-world message examples
  it('should handle real messages', () => {
    const mockMessages: RawMessage[] = [
      createMockMessage(
        ['langchain_core', 'messages', 'HumanMessage'], 
        'Tell me a news in Taiwan today!',
        'constructor',
        { 
          additional_kwargs: {}, 
          response_metadata: {}, 
          id: '************************************' 
        }
      ),
      createMockMessage(
        ['langchain_core', 'messages', 'AIMessage'],
        [
          {
            type: "text",
            text: "I'll search for current news about Taiwan."
          },
          {
            type: "tool_use",
            id: "toolu_01UVSj3BcnTTGsWGMdoeuPis",
            name: "tavily_search_results_json",
            input: {
              input: "latest news Taiwan today"
            }
          }
        ],
        'constructor',
        {
          tool_calls: [
            {
              name: "tavily_search_results_json",
              args: {
                input: "latest news Taiwan today"
              },
              id: "toolu_01UVSj3BcnTTGsWGMdoeuPis",
              type: "tool_call"
            }
          ],
          usage_metadata: {
            input_tokens: 473,
            output_tokens: 71
          },
          id: "msg_01RS1gxMeMGdw6TkUScN4KxK"
        }
      ),
      createMockMessage(
        ['langchain_core', 'messages', 'AIMessage'],
        "Based on the latest news, here's a significant development from Taiwan.",
        'constructor',
        {
          usage_metadata: {},
          id: "msg_01Nhr6JKMwvfECE9CD56rqkc",
          tool_calls: []
        }
      )
    ];

    const result = parseAgentMessages(mockMessages);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle real messages 2', () => {
    const mockMessages: RawMessage[] = [
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "SystemMessage"
        ],
        "kwargs": {
          "content": "You are a helpful news assistant. Please provide informative responses about news topics. Today is 3/12/2025. You search for news related to a certain query, and stay objective to only return facts, and focus on how different media report differnet things.",
          "additional_kwargs": {},
          "response_metadata": {},
          "id": "************************************"
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "HumanMessage"
        ],
        "kwargs": {
          "content": "What's happening in technology news?",
          "additional_kwargs": {},
          "response_metadata": {},
          "id": "************************************"
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "HumanMessage"
        ],
        "kwargs": {
          "content": "tell me what's new in Tesla",
          "additional_kwargs": {},
          "response_metadata": {},
          "id": "************************************"
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "HumanMessage"
        ],
        "kwargs": {
          "content": "tell me what's new in Tesla",
          "additional_kwargs": {},
          "response_metadata": {},
          "id": "************************************"
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "AIMessage"
        ],
        "kwargs": {
          "content": [
            {
              "type": "text",
              "text": "I'll search for recent news about Tesla."
            },
            {
              "type": "tool_use",
              "id": "toolu_01V5LzygP4vrUghBhTkvacUJ",
              "name": "tavily_search_results_json",
              "input": {
                "input": "Tesla latest news developments 2025"
              }
            }
          ],
          "additional_kwargs": {
            "id": "msg_01Mck4jCRsfYDEsQMMfwrvZ7",
            "type": "message",
            "role": "assistant",
            "model": "claude-3-5-sonnet-20241022",
            "stop_reason": "tool_use",
            "stop_sequence": null,
            "usage": {
              "input_tokens": 506,
              "cache_creation_input_tokens": 0,
              "cache_read_input_tokens": 0,
              "output_tokens": 74
            }
          },
          "tool_calls": [
            {
              "name": "tavily_search_results_json",
              "args": {
                "input": "Tesla latest news developments 2025"
              },
              "id": "toolu_01V5LzygP4vrUghBhTkvacUJ",
              "type": "tool_call"
            }
          ],
          "usage_metadata": {
            "input_tokens": 506,
            "output_tokens": 74,
            "total_tokens": 580,
            "input_token_details": {
              "cache_creation": 0,
              "cache_read": 0
            }
          },
          "response_metadata": {
            "id": "msg_01Mck4jCRsfYDEsQMMfwrvZ7",
            "model": "claude-3-5-sonnet-20241022",
            "stop_reason": "tool_use",
            "stop_sequence": null,
            "usage": {
              "input_tokens": 506,
              "cache_creation_input_tokens": 0,
              "cache_read_input_tokens": 0,
              "output_tokens": 74
            },
            "type": "message",
            "role": "assistant"
          },
          "id": "msg_01Mck4jCRsfYDEsQMMfwrvZ7",
          "invalid_tool_calls": []
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "ToolMessage"
        ],
        "kwargs": {
          "content": "[{\"title\":\"Tesla in 2025: The Latest Updates from Elon Musk on X\",\"url\":\"https://www.tesla-mag.com/en/tesla-in-2025-the-latest-updates-from-elon-musk-on-x/\",\"content\":\"Tesla in 2025: The Latest Updates from Elon Musk on X Tesla On February 21, 2025, Musk responded to a post by @SawyerMerritt, emphasizing Tesla’s manufacturing innovation: “The Tesla factory IS the product. On February 10, Musk reiterated Tesla’s self-driving ambitions with a concrete timeline: “Tesla still on track to launch autonomous ride-hailing in Austin in June and expand to many US cities by year-end.” He added that the goal is safety “well above the average human driver.” This builds on Tesla’s ongoing work with its Full Self-Driving (FSD) system, which Musk praised on February 23 as “like magic.” The planned public rollout of a robotaxi service in Austin could mark a major milestone for Tesla’s vision of autonomous mobility. Tesla\",\"score\":0.9047265,\"raw_content\":null},{\"title\":\"Tesla's Bright Spots: Exciting Updates in March 2025\",\"url\":\"https://www.tesla-mag.com/en/teslas-bright-spots-exciting-updates-in-march-2025/\",\"content\":\"Tesla Mag Tesla Join Tesla Mag Tesla Mag Social media’s lighting up with posts from owners like @TheSonOfWalkley, who called it “the start of a new era for Tesla.” With longer range and sharper looks, the updated Model Y is set to keep Tesla’s top seller dominating American roads. A $29,000 Tesla? Elon Musk dropped a tantalizing hint this week: a new compact Tesla priced around $29,000 could launch in “a few months.” Aimed at budget-conscious buyers, this affordable EV could widen Tesla’s reach and bring more Americans into the electric fold. Tesla Model Y Juniper: A Stunning “Afterburner” Design Revolutionizing Electric Vehicles in Asia Tesla Mag is a global media company dedicated to Premium electric vehicles. Tesla News Tesla Join Tesla Mag\",\"score\":0.756376,\"raw_content\":null},{\"title\":\"Talking Tesla: 2025 could see a massive autonomous-driven rally or a ...\",\"url\":\"https://seekingalpha.com/news/4419336-talking-tesla-2025-could-see-a-massive-autonomous-driven-rally-or-a-need-for-painful-doge-like-cuts\",\"content\":\"On Wall Street, the average analyst price target on Tesla is $344.82 (+56% upside), with some firms still expecting Tesla to end the year with a market cap of close to $2 trillion.\",\"score\":0.58123237,\"raw_content\":null}]",
          "tool_call_id": "toolu_01V5LzygP4vrUghBhTkvacUJ",
          "name": "tavily_search_results_json",
          "additional_kwargs": {},
          "response_metadata": {},
          "id": "************************************"
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "AIMessage"
        ],
        "kwargs": {
          "content": [
            {
              "type": "text",
              "text": "Based on the search results, here are the key recent developments with Tesla:\n\n1. Autonomous Driving Progress:\n- Tesla is planning to launch autonomous ride-hailing services in Austin in June 2025\n- The company aims to expand this service to many US cities by the end of 2025\n- Tesla claims the safety standards will be \"well above the average human driver\"\n- Their Full Self-Driving (FSD) system continues to receive updates\n\n2. New Vehicle Developments:\n- Tesla is reportedly working on a new affordable model\n- Elon Musk has hinted at a new compact Tesla priced around $29,000\n- This budget-friendly model could be launched in the coming months\n- The Model Y has received updates with improved range and design changes\n\n3. Manufacturing and Business:\n- Elon Musk has emphasized that \"The Tesla factory IS the product,\" highlighting their focus on manufacturing innovation\n- The company's stock performance is being closely watched, with analysts having an average price target of $344.82 (representing a 56% upside potential)\n- Some Wall Street firms project Tesla could reach a market cap of nearly $2 trillion by the end of the year\n\nLet me search for any additional recent developments."
            },
            {
              "type": "tool_use",
              "id": "toolu_01RAzamfScJfFho7GMWoi8dU",
              "name": "tavily_search_results_json",
              "input": {
                "input": "Tesla latest manufacturing updates production numbers 2025"
              }
            }
          ],
          "additional_kwargs": {
            "id": "msg_01SgXjDgKsKDqdpJNYTn8Y2F",
            "type": "message",
            "role": "assistant",
            "model": "claude-3-5-sonnet-20241022",
            "stop_reason": "tool_use",
            "stop_sequence": null,
            "usage": {
              "input_tokens": 1251,
              "cache_creation_input_tokens": 0,
              "cache_read_input_tokens": 0,
              "output_tokens": 338
            }
          },
          "tool_calls": [
            {
              "name": "tavily_search_results_json",
              "args": {
                "input": "Tesla latest manufacturing updates production numbers 2025"
              },
              "id": "toolu_01RAzamfScJfFho7GMWoi8dU",
              "type": "tool_call"
            }
          ],
          "usage_metadata": {
            "input_tokens": 1251,
            "output_tokens": 338,
            "total_tokens": 1589,
            "input_token_details": {
              "cache_creation": 0,
              "cache_read": 0
            }
          },
          "response_metadata": {
            "id": "msg_01SgXjDgKsKDqdpJNYTn8Y2F",
            "model": "claude-3-5-sonnet-20241022",
            "stop_reason": "tool_use",
            "stop_sequence": null,
            "usage": {
              "input_tokens": 1251,
              "cache_creation_input_tokens": 0,
              "cache_read_input_tokens": 0,
              "output_tokens": 338
            },
            "type": "message",
            "role": "assistant"
          },
          "id": "msg_01SgXjDgKsKDqdpJNYTn8Y2F",
          "invalid_tool_calls": []
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "ToolMessage"
        ],
        "kwargs": {
          "content": "[{\"title\":\"Tesla Fourth Quarter 2024 Production, Deliveries & Deployments\",\"url\":\"https://ir.tesla.com/press-release/tesla-fourth-quarter-2024-production-deliveries-and-deployments\",\"content\":\"Tesla Fourth Quarter 2024 Production, Deliveries & Deployments | Tesla Investor Relations Tesla will post its financial results for the fourth quarter of 2024 after market close on Wednesday, January 29, 2025. Tesla management will hold a live question and answer webcast that day at 4:30 p.m. Central Time (5:30 p.m. Eastern Time) to discuss the Company’s financial and business results and outlook. What: Tesla Q4 2024 Financial Results and Q&A Webcast Q4 2024 Update: https://ir.tesla.com Tesla vehicle deliveries and storage deployments represent only two measures of the Company’s financial performance and should not be relied on as an indicator of quarterly financial results, which depend on a variety of factors, including average selling price, cost of sales, foreign exchange movements and others as to be disclosed in the 10-K for the year ended on December 31, 2024.\",\"score\":0.45101276,\"raw_content\":null},{\"title\":\"Tesla (TSLA) confirms delivery of 495,570 EVs, way below its ... - Electrek\",\"url\":\"https://electrek.co/2025/01/02/tesla-tsla-confirms-delivery-of-495570-evs-way-below-its-own-guidance/\",\"content\":\"Tesla (TSLA) released its production and delivery results for the fourth quarter and full year 2024 today. The automaker confirmed having delivered 495,570 electric vehicles, way below\",\"score\":0.21403393,\"raw_content\":null},{\"title\":\"Tesla throttles down Cybertruck production, shift workers to ... - Electrek\",\"url\":\"https://electrek.co/2025/01/16/tesla-throttles-down-cybertruck-production-shift-workers-to-model-y/\",\"content\":\"2024 was basically the first year in Tesla history where they had far more manufacturing capacity than they had customers willing to buy their cars. Tesla was reporting current, actual\",\"score\":0.17330252,\"raw_content\":null}]",
          "tool_call_id": "toolu_01RAzamfScJfFho7GMWoi8dU",
          "name": "tavily_search_results_json",
          "additional_kwargs": {},
          "response_metadata": {},
          "id": "************************************"
        }
      },
      {
        "lc": 1,
        "type": "constructor",
        "id": [
          "langchain_core",
          "messages",
          "AIMessage"
        ],
        "kwargs": {
          "content": "Additional updates regarding Tesla's recent performance:\n\n4. Production and Delivery Numbers:\n- Tesla reported its Q4 2024 numbers in January 2025\n- The company delivered 495,570 EVs in Q4 2024, which was below their initial guidance\n- Tesla has been adjusting production strategies, including:\n  * Shifting some workers from Cybertruck production to Model Y production\n  * Managing manufacturing capacity in relation to demand\n\n5. Business Operations:\n- The company recently held its Q4 2024 financial results webcast\n- Tesla continues to emphasize that vehicle deliveries and storage deployments are just two measures of their overall financial performance\n- Other factors affecting their performance include average selling price, cost of sales, and foreign exchange movements\n\nThe news suggests that Tesla is in a period of significant transition, balancing ambitious autonomous driving goals with production challenges and market demands. They're pursuing both high-tech advancement (autonomous driving) and market expansion (affordable vehicles) while dealing with some production adjustments and delivery challenges.",
          "additional_kwargs": {
            "id": "msg_01XopsnrV4eAyiEcx1HbWhzu",
            "type": "message",
            "role": "assistant",
            "model": "claude-3-5-sonnet-20241022",
            "stop_reason": "end_turn",
            "stop_sequence": null,
            "usage": {
              "input_tokens": 2124,
              "cache_creation_input_tokens": 0,
              "cache_read_input_tokens": 0,
              "output_tokens": 226
            }
          },
          "usage_metadata": {
            "input_tokens": 2124,
            "output_tokens": 226,
            "total_tokens": 2350,
            "input_token_details": {
              "cache_creation": 0,
              "cache_read": 0
            }
          },
          "response_metadata": {
            "id": "msg_01XopsnrV4eAyiEcx1HbWhzu",
            "model": "claude-3-5-sonnet-20241022",
            "stop_reason": "end_turn",
            "stop_sequence": null,
            "usage": {
              "input_tokens": 2124,
              "cache_creation_input_tokens": 0,
              "cache_read_input_tokens": 0,
              "output_tokens": 226
            },
            "type": "message",
            "role": "assistant"
          },
          "id": "msg_01XopsnrV4eAyiEcx1HbWhzu",
          "tool_calls": [],
          
        }
      }
    ]

    const result = processAgentResponse(mockMessages);
    
    console.log(result)
  })
});

describe('processAgentResponse', () => {
  it('should handle invalid input gracefully', () => {
    // @ts-ignore - Testing with invalid input
    const result1 = processAgentResponse(null);
    // @ts-ignore - Testing with invalid input
    const result2 = processAgentResponse([]);
    
    expect(result1.response).toBe(AGENT_MESSAGES.ERROR);
    expect(result1.messages).toEqual([]);
    
    expect(result2.response).toBe(AGENT_MESSAGES.ERROR);
    expect(result2.messages).toEqual([]);
  });
  
  it('should extract the final response and messages', () => {
    const mockMessages: RawMessage[] = [
      createMockMessage(['langchain_core', 'messages', 'HumanMessage'], 'User question'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'Thinking...'),
      createMockMessage(['langchain_core', 'messages', 'AIMessage'], 'Final answer')
    ];

    const result = processAgentResponse(mockMessages);
    
    expect(result.response).toBe('Final answer');
    expect(result.messages.length).toBe(2);
    expect(result.messages[0].type).toBe('thought');
    expect(result.messages[1].type).toBe('message');
  });
  
  it('should fall back to error message if no final response found', () => {
    const mockMessages: RawMessage[] = [
      createMockMessage(['langchain_core', 'messages', 'HumanMessage'], 'User question')
      // No AI message responses
    ];

    const result = processAgentResponse(mockMessages);
    
    expect(result.response).toBe(AGENT_MESSAGES.ERROR);
    expect(result.messages.length).toBe(0);
  });
});

// This enables running the test with Jest
export {};
