/**
 * AI Agent for Monday.com Business Intelligence
 * Uses OpenAI with tool calling to answer founder-level queries
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const getOpenAI = () => {
  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
};

const AGENT_MODEL = "gemini-3.6-flash";

export const SYSTEM_PROMPT = `You are an elite Business Intelligence Agent for a professional services firm. You have access to real-time data from Monday.com boards containing:

1. **Deals Board** - Sales pipeline data including deal names, owners, clients, statuses, values, sectors, stages, and closure probabilities
2. **Work Orders Board** - Project execution data including work order details, billing amounts, collection status, sectors, and operational metrics

## Your Role
You answer founder and executive-level business intelligence queries by:
- Fetching and analyzing live data from Monday.com
- Cleaning and normalizing messy real-world data gracefully
- Providing actionable insights with context, not just raw numbers
- Identifying data quality issues and communicating caveats
- Cross-referencing multiple data sources when needed

## Communication Style
- Be direct, confident, and executive-ready
- Lead with the key insight, then provide supporting data
- Use Indian number formatting (Lakhs/Crores) for currency
- Flag data quality issues transparently
- Ask clarifying questions only when genuinely ambiguous
- Structure complex answers with clear sections

## Data Handling
- Handle missing/null values gracefully - never crash, always explain gaps
- Normalize inconsistent date formats, naming conventions
- When data is incomplete, provide best available analysis with caveats
- Cross-validate data across boards when possible

## Available Tools
- fetch_boards: Get list of all Monday.com boards
- fetch_deals_data: Get normalized deals pipeline data with analytics
- fetch_work_orders_data: Get normalized work orders data with analytics
- cross_board_analysis: Analyze data across both boards simultaneously
- generate_leadership_update: Prepare a structured leadership update report

Always fetch fresh data before answering business queries. Be proactive about providing context and insights beyond just the raw answer.`;

export interface AgentTool {
  name: string;
  description: string;
  parameters: object;
}

export const AGENT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "fetch_boards",
      description: "Fetch all available Monday.com boards and their metadata. Use this first to discover which boards are available.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_deals_data",
      description: "Fetch and analyze the deals/pipeline board from Monday.com. Returns normalized deal data with pipeline metrics including deal values, stages, sectors, owners, conversion rates, and data quality info.",
      parameters: {
        type: "object",
        properties: {
          board_id: {
            type: "string",
            description: "The Monday.com board ID for deals. If unknown, use fetch_boards first.",
          },
          filter_sector: {
            type: "string",
            description: "Optional: Filter deals by sector (e.g., 'Energy', 'Manufacturing')",
          },
          filter_status: {
            type: "string",
            description: "Optional: Filter deals by status (e.g., 'Won', 'Active', 'Lost')",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_work_orders_data",
      description: "Fetch and analyze the work orders board from Monday.com. Returns normalized work order data with revenue metrics including billing amounts, collection status, operational metrics, AR analysis.",
      parameters: {
        type: "object",
        properties: {
          board_id: {
            type: "string",
            description: "The Monday.com board ID for work orders. If unknown, use fetch_boards first.",
          },
          filter_sector: {
            type: "string",
            description: "Optional: Filter work orders by sector",
          },
          filter_status: {
            type: "string",
            description: "Optional: Filter work orders by execution status",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cross_board_analysis",
      description: "Perform analysis across both Deals and Work Orders boards simultaneously. Use for queries that span pipeline and execution data.",
      parameters: {
        type: "object",
        properties: {
          deals_board_id: {
            type: "string",
            description: "Board ID for deals",
          },
          work_orders_board_id: {
            type: "string",
            description: "Board ID for work orders",
          },
          analysis_type: {
            type: "string",
            enum: ["sector_overview", "revenue_pipeline", "full_business_overview"],
            description: "Type of cross-board analysis to perform",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_leadership_update",
      description: "Generate a structured leadership/board update report combining pipeline health, revenue performance, operational metrics, and key insights. Perfect for weekly/monthly leadership reviews.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Reporting period (e.g., 'Q1 2024', 'This Month', 'YTD')",
          },
          focus_areas: {
            type: "array",
            items: { type: "string" },
            description: "Specific areas to focus on in the update",
          },
        },
        required: [],
      },
    },
  },
];

export interface AgentMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
  metadata?: {
    type?: string;
    data?: unknown;
    charts?: unknown;
    hasData?: boolean;
  };
}

export interface AgentResponse {
  message: string;
  toolsUsed: string[];
  metadata?: {
    type?: string;
    data?: unknown;
    charts?: unknown;
    hasData?: boolean;
  };
}

/**
 * Run the AI agent with conversation history
 */
export async function runAgent(
  userMessage: string,
  conversationHistory: ChatCompletionMessageParam[],
  toolExecutor: (toolName: string, toolArgs: Record<string, unknown>) => Promise<unknown>
): Promise<AgentResponse> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const toolsUsed: string[] = [];
  let lastMetadata: AgentResponse["metadata"] = undefined;

  // Agentic loop - allow up to 5 tool calls
  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await getOpenAI().chat.completions.create({
      model: AGENT_MODEL,
      messages,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    // If no tool calls, we're done
    if (!assistantMessage.tool_calls?.length || choice.finish_reason === "stop") {
      return {
        message: assistantMessage.content ?? "I couldn't generate a response.",
        toolsUsed,
        metadata: lastMetadata,
      };
    }

    // Execute tool calls
    for (const toolCall of assistantMessage.tool_calls) {
      const tc = toolCall as { id: string; function: { name: string; arguments: string } };
      const toolName = tc.function.name;
      const toolArgs = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;

      toolsUsed.push(toolName);

      let llmToolResult: Record<string, unknown> = {};
      try {
        const toolResult = await toolExecutor(toolName, toolArgs);
        
        // Extract metadata for UI rendering
        if (
          toolResult &&
          typeof toolResult === "object"
        ) {
          llmToolResult = { ...(toolResult as Record<string, unknown>) };
          if ("metadata" in llmToolResult) {
            const tr = toolResult as { metadata?: AgentResponse["metadata"] };
            lastMetadata = tr.metadata;
            delete llmToolResult.metadata; // Strip metadata to avoid Groq 8k token limit
          }
          
          // Clean nested metadata in cross-board analysis
          if (llmToolResult.deals && (llmToolResult.deals as Record<string, unknown>).metadata) {
            delete (llmToolResult.deals as Record<string, unknown>).metadata;
          }
          if (llmToolResult.workOrders && (llmToolResult.workOrders as Record<string, unknown>).metadata) {
            delete (llmToolResult.workOrders as Record<string, unknown>).metadata;
          }
        }
      } catch (error) {
        llmToolResult = {
          error: error instanceof Error ? error.message : String(error),
          message: "Tool execution failed - providing best available response",
        };
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(llmToolResult),
      });
    }
  }

  // Fallback if we exceed iterations
  const finalResponse = await getOpenAI().chat.completions.create({
    model: AGENT_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  });

  return {
    message: finalResponse.choices[0].message.content ?? "Analysis complete.",
    toolsUsed,
    metadata: lastMetadata,
  };
}
