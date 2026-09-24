import {
  ChatNode,
  ModelOption,
  TokenUsage,
  TreeComplexityMetrics,
} from "../types/chat";

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    description:
      "Lightweight, lowest-latency model for rapid, simple thread replies",
    badge: "Ultra Fast",
    tier: "low",
    speed: "Ultra Fast",
    reasoning: "Standard",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    description:
      "High-speed, intelligent model optimized for tree context traversal",
    badge: "Fast & Smart",
    tier: "medium",
    speed: "Fast",
    reasoning: "Smart",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    description:
      "Deep reasoning model ideal for complex branch synthesis & deep context",
    badge: "Pro Reasoning",
    tier: "high",
    speed: "Moderate",
    reasoning: "Pro Deep",
  },
];

const SYSTEM_INSTRUCTION =
  "You are an expert AI software architect and logical problem solver operating within AI Tree Chat. Respond concisely with structured markdown formatting. Keep answers pragmatic, clear, and action-oriented.";

const INTERACTIONS_URL =
  "/gemini-api/v1beta/interactions";
const API_REVISION = "2026-05-20";

class HttpError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`Gemini API error: ${status} ${body}`);
  }
}

export interface GeminiResult {
  text: string;
  /** Absent in simulation mode, where no API call is made. */
  usage?: TokenUsage;
}

/**
 * Tokens consumed by a path, taken from the API-reported usage on its most recent
 * assistant node (prompt + completion covers the whole path up to that reply).
 */
export function getPathTokenCount(historyPath: ChatNode[]): number {
  for (let i = historyPath.length - 1; i >= 0; i--) {
    const usage = historyPath[i].metadata?.usage;
    if (usage) return usage.totalTokens;
  }
  return 0;
}

export function calculatePathComplexity(
  historyPath: ChatNode[],
  branchCount: number = 0,
): TreeComplexityMetrics {
  const depth = historyPath.length;
  const totalTokens = getPathTokenCount(historyPath);

  const depthScore = depth * 1.5;
  const tokenScore = totalTokens / 200;
  const branchScore = branchCount * 2.0;

  const rawScore = depthScore + tokenScore + branchScore;
  const score = Math.round(rawScore * 10) / 10;

  let tier: "low" | "medium" | "high" = "low";
  let recommendedModelId = "gemini-3.5-flash-lite";
  let reason = "";

  if (score < 8) {
    tier = "low";
    recommendedModelId = "gemini-3.5-flash-lite";
    reason = `Low complexity (Depth ${depth}, ${totalTokens} tokens). Gemini 3.5 Flash-Lite recommended for instant responses.`;
  } else if (score <= 18) {
    tier = "medium";
    recommendedModelId = "gemini-3.8-flash";
    reason = `Medium complexity (Depth ${depth}, ${totalTokens} tokens). Gemini 3.8 Flash recommended for balanced intelligence.`;
  } else {
    tier = "high";
    recommendedModelId = "gemini-3.1-pro-preview";
    reason = `High complexity (Depth ${depth}, ${totalTokens} tokens, ${branchCount} branches). Gemini 3.1 Pro recommended for deep context reasoning.`;
  }

  return {
    score,
    tier,
    recommendedModelId,
    depth,
    totalTokens,
    branchCount,
    reason,
  };
}

export async function callGeminiAPI(
  historyPath: ChatNode[],
  selectedModel: string = "gemini-3.8-flash",
  customApiKey?: string,
  demoMode: boolean = false,
): Promise<GeminiResult> {
  // Demo mode never touches the network: canned responses only.
  if (demoMode) {
    const lastUserPrompt =
      historyPath[historyPath.length - 1]?.content || "Unknown prompt";
    return {
      text: generateSimulationResponse(lastUserPrompt, historyPath.length),
    };
  }

  const apiKey = (
    customApiKey?.trim() ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ""
  )
    .trim()
    .replace(/^['"]|['"]$/g, "");

  // Standardize message roles for the Gemini Interactions REST API
  const turns = historyPath.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    content: [{ type: "text", text: item.content }],
  }));

  if (!apiKey) {
    throw new Error(
      "No Gemini API key configured. Add a key in the sidebar (or VITE_GEMINI_API_KEY), or turn on Demo Mode.",
    );
  }

  let delay = 1000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(INTERACTIONS_URL, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
          "Api-Revision": API_REVISION,
        },
        body: JSON.stringify({
          model: selectedModel,
          input: turns,
          system_instruction: SYSTEM_INSTRUCTION,
        }),
      });

      if (!response.ok) {
        throw new HttpError(response.status, await response.text());
      }

      const data = await response.json();
      const generatedText: string = (data.outputs ?? [])
        .filter((o: any) => o.type === "text" && o.text)
        .map((o: any) => o.text)
        .join("");
      if (!generatedText) {
        throw new Error("No text content returned from Gemini API response.");
      }
      const meta = data.usage;
      const promptTokens = meta?.total_input_tokens ?? 0;
      const completionTokens = meta?.total_output_tokens ?? 0;
      return {
        text: generatedText,
        usage: meta
          ? {
              promptTokens,
              completionTokens,
              totalTokens: meta.total_tokens ?? promptTokens + completionTokens,
            }
          : undefined,
      };
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Non-retriable client errors (4xx excluding 429 rate limits) throw immediately
      const status = err instanceof HttpError ? err.status : undefined;
      const isClientError =
        status !== undefined && status >= 400 && status < 500 && status !== 429;
      if (
        attempt === 2 ||
        isClientError ||
        lastError.message.includes("is not found") ||
        lastError.message.includes("API key") ||
        lastError.message.includes("is not supported")
      ) {
        throw lastError;
      }
      console.warn(
        `[Gemini API] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }

  throw lastError || new Error("Failed to communicate with Gemini API.");
}

export async function synthesizeBranches(
  pathA: ChatNode[],
  pathB: ChatNode[],
  selectedModel: string = "gemini-3.8-flash",
  customApiKey?: string,
  demoMode: boolean = false,
): Promise<string> {
  const prompt = `Synthesize and compare the following two conversation branches:

### Branch A (Path depth: ${pathA.length} nodes):
${pathA.map((n) => `[${n.role.toUpperCase()}]: ${n.content}`).join("\n")}

---

### Branch B (Path depth: ${pathB.length} nodes):
${pathB.map((n) => `[${n.role.toUpperCase()}]: ${n.content}`).join("\n")}

---

**Task:** Provide a structured comparison highlighting key trade-offs, consensus points, and a recommended unified approach.`;

  const synthNode: ChatNode = {
    id: "synth-prompt",
    parentId: null,
    childrenIds: [],
    role: "user",
    content: prompt,
    timestamp: new Date().toLocaleTimeString(),
  };

  const { text } = await callGeminiAPI(
    [synthNode],
    selectedModel,
    customApiKey,
    demoMode,
  );
  return text;
}

function generateSimulationResponse(
  userPrompt: string,
  contextLength: number,
): string {
  const promptLower = userPrompt.toLowerCase();

  if (
    promptLower.includes("microservices") ||
    promptLower.includes("patterns") ||
    promptLower.includes("architecture")
  ) {
    return `### Core Architectural Insights\n\nBased on your prompt with **${contextLength} isolated path messages** in memory:\n\n1. **Decoupled State Isolation**: By keeping conversation branches isolated to direct ancestor nodes, each thread maintains clean, unpolluted context.\n2. **Scalable Microservice Design**: Use Event-Driven Architecture (EDA) for asynchronous processing, combined with API Gateways (Kong/Envoy) for external boundary routing.\n3. **Resilient Data Persistence**: Implement Database-per-Service alongside the Outbox Pattern to guarantee idempotency and transactional integrity.`;
  }

  if (
    promptLower.includes("event-driven") ||
    promptLower.includes("idempotent") ||
    promptLower.includes("kafka")
  ) {
    return `### Idempotency & Reliability Guarantees\n\nTo ensure exact-once processing in event streams:\n\n* **Idempotency Keys**: Store processed message UUIDs in a distributed cache (e.g. Redis) with TTL.\n* **Transactional Outbox**: Commit business database updates and outbound event logs in a single local database transaction.\n* **Dead Letter Queues (DLQ)**: Automatically isolate failing payload messages after exponential backoff retries.`;
  }

  if (promptLower.includes("sharding") || promptLower.includes("database")) {
    return `### Database Sharding Strategy\n\n* **Partition Key Selection**: Distribute load based on consistent hashing of \`tenant_id\` or \`user_id\`.\n* **Cross-Shard Queries**: Minimize scatter-gather queries using materialized views or read replicas.\n* **Rebalancing**: Leverage dynamic range partitioning to handle data growth without downtime.`;
  }

  return `### AI Tree Chat Response\n\nI processed your request using the hierarchy context (**${contextLength} ancestor nodes** in history path).\n\n* **Context Path Preserved**: Root ancestry maintained strictly without cross-branch contamination.\n* **Branch Isolation**: Parallel explorations remain fully independent.\n\n*What would you like to explore next in this branch?*`;
}
