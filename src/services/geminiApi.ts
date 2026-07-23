import { ChatNode, ModelOption, TreeComplexityMetrics } from '../types/chat';

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Next-gen lightweight model optimized for rapid, simple thread replies',
    badge: 'Ultra Fast',
    tier: 'low',
    speed: 'Ultra Fast',
    reasoning: 'Standard'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'High-speed, intelligent model optimized for tree context traversal',
    badge: 'Fast & Smart',
    tier: 'medium',
    speed: 'Fast',
    reasoning: 'Smart'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Deep reasoning model ideal for complex branch synthesis & deep context',
    badge: 'Pro Reasoning',
    tier: 'high',
    speed: 'Moderate',
    reasoning: 'Pro Deep'
  }
];

export function calculatePathComplexity(
  historyPath: ChatNode[],
  branchCount: number = 0
): TreeComplexityMetrics {
  const depth = historyPath.length;
  const totalChars = historyPath.reduce((sum, node) => sum + node.content.length, 0);
  const estimatedTokens = Math.max(1, Math.ceil(totalChars / 4));

  const depthScore = depth * 1.5;
  const tokenScore = estimatedTokens / 200;
  const branchScore = branchCount * 2.0;

  const rawScore = depthScore + tokenScore + branchScore;
  const score = Math.round(rawScore * 10) / 10;

  let tier: 'low' | 'medium' | 'high' = 'low';
  let recommendedModelId = 'gemini-2.0-flash';
  let reason = '';

  if (score < 8) {
    tier = 'low';
    recommendedModelId = 'gemini-2.0-flash';
    reason = `Low complexity (Depth ${depth}, ~${estimatedTokens} tokens). Gemini 2.0 Flash recommended for instant responses.`;
  } else if (score <= 18) {
    tier = 'medium';
    recommendedModelId = 'gemini-2.5-flash';
    reason = `Medium complexity (Depth ${depth}, ~${estimatedTokens} tokens). Gemini 2.5 Flash recommended for balanced intelligence.`;
  } else {
    tier = 'high';
    recommendedModelId = 'gemini-1.5-pro';
    reason = `High complexity (Depth ${depth}, ~${estimatedTokens} tokens, ${branchCount} branches). Gemini 1.5 Pro recommended for deep context reasoning.`;
  }

  return {
    score,
    tier,
    recommendedModelId,
    depth,
    estimatedTokens,
    branchCount,
    reason
  };
}


export async function callGeminiAPI(
  historyPath: ChatNode[],
  selectedModel: string = 'gemini-2.5-flash',
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';

  // Standardize message roles for Gemini REST API
  const formattedContents = historyPath.map(item => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.content }]
  }));

  const payload = {
    contents: formattedContents,
    systemInstruction: {
      parts: [
        {
          text: "You are an expert AI software architect and logical problem solver operating within AI Tree Chat. Respond concisely with structured markdown formatting. Keep answers pragmatic, clear, and action-oriented."
        }
      ]
    }
  };

  if (apiKey.trim()) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    let delay = 1000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) return generatedText;
          throw new Error("No text content returned from Gemini API response.");
        } else {
          // Parse standard Gemini API error format
          let apiErrorMessage = `API Request failed with HTTP ${response.status}: ${response.statusText}`;
          try {
            const errJson = await response.json();
            if (errJson?.error?.message) {
              apiErrorMessage = errJson.error.message;
            }
          } catch (_) {
            // Ignore JSON parsing failure
          }

          const error = new Error(apiErrorMessage);

          // Non-retriable HTTP client errors (4xx excluding 429 rate limits) should throw immediately
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }
          lastError = error;
        }
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Throw immediately if it's a known non-retriable client error
        if (
          attempt === 2 ||
          lastError.message.includes('is not found') ||
          lastError.message.includes('API key') ||
          lastError.message.includes('is not supported')
        ) {
          throw lastError;
        }
        console.warn(`[Gemini API] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }

    throw lastError || new Error("Failed to communicate with Gemini API.");
  }

  // Simulation mode fallback generator when API key is unconfigured
  const lastUserPrompt = historyPath[historyPath.length - 1]?.content || 'Unknown prompt';
  return generateSimulationResponse(lastUserPrompt, historyPath.length);
}

export async function synthesizeBranches(
  pathA: ChatNode[],
  pathB: ChatNode[],
  selectedModel: string = 'gemini-2.5-flash',
  customApiKey?: string
): Promise<string> {
  const prompt = `Synthesize and compare the following two conversation branches:

### Branch A (Path depth: ${pathA.length} nodes):
${pathA.map(n => `[${n.role.toUpperCase()}]: ${n.content}`).join('\n')}

---

### Branch B (Path depth: ${pathB.length} nodes):
${pathB.map(n => `[${n.role.toUpperCase()}]: ${n.content}`).join('\n')}

---

**Task:** Provide a structured comparison highlighting key trade-offs, consensus points, and a recommended unified approach.`;

  const synthNode: ChatNode = {
    id: 'synth-prompt',
    parentId: null,
    childrenIds: [],
    role: 'user',
    content: prompt,
    timestamp: new Date().toLocaleTimeString()
  };

  return callGeminiAPI([synthNode], selectedModel, customApiKey);
}

function generateSimulationResponse(userPrompt: string, contextLength: number): string {
  const promptLower = userPrompt.toLowerCase();

  if (promptLower.includes('microservices') || promptLower.includes('patterns') || promptLower.includes('architecture')) {
    return `### Core Architectural Insights\n\nBased on your prompt with **${contextLength} isolated path messages** in memory:\n\n1. **Decoupled State Isolation**: By keeping conversation branches isolated to direct ancestor nodes, each thread maintains clean, unpolluted context.\n2. **Scalable Microservice Design**: Use Event-Driven Architecture (EDA) for asynchronous processing, combined with API Gateways (Kong/Envoy) for external boundary routing.\n3. **Resilient Data Persistence**: Implement Database-per-Service alongside the Outbox Pattern to guarantee idempotency and transactional integrity.`;
  }

  if (promptLower.includes('event-driven') || promptLower.includes('idempotent') || promptLower.includes('kafka')) {
    return `### Idempotency & Reliability Guarantees\n\nTo ensure exact-once processing in event streams:\n\n* **Idempotency Keys**: Store processed message UUIDs in a distributed cache (e.g. Redis) with TTL.\n* **Transactional Outbox**: Commit business database updates and outbound event logs in a single local database transaction.\n* **Dead Letter Queues (DLQ)**: Automatically isolate failing payload messages after exponential backoff retries.`;
  }

  if (promptLower.includes('sharding') || promptLower.includes('database')) {
    return `### Database Sharding Strategy\n\n* **Partition Key Selection**: Distribute load based on consistent hashing of \`tenant_id\` or \`user_id\`.\n* **Cross-Shard Queries**: Minimize scatter-gather queries using materialized views or read replicas.\n* **Rebalancing**: Leverage dynamic range partitioning to handle data growth without downtime.`;
  }

  return `### AI Tree Chat Response\n\nI processed your request using the hierarchy context (**${contextLength} ancestor nodes** in history path).\n\n* **Context Path Preserved**: Root ancestry maintained strictly without cross-branch contamination.\n* **Branch Isolation**: Parallel explorations remain fully independent.\n\n*What would you like to explore next in this branch?*`;
}
