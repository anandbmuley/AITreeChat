import { ChatNode, ModelOption } from '../types/chat';

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.5-flash-preview-09-2025',
    name: 'Gemini 2.5 Flash',
    description: 'High-speed, intelligent model optimized for tree context traversal',
    badge: 'Fast & Smart'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Next-gen lightweight model for rapid thread replies',
    badge: 'Ultra Fast'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Deep reasoning model ideal for complex branch synthesis',
    badge: 'Pro Reasoning'
  }
];

export async function callGeminiAPI(
  historyPath: ChatNode[],
  selectedModel: string = 'gemini-2.5-flash-preview-09-2025',
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
    for (let attempt = 0; attempt < 5; attempt++) {
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
        }
      } catch (err) {
        console.warn(`[Gemini API] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, err);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  // Simulation mode fallback generator when API key is unconfigured or call fails
  const lastUserPrompt = historyPath[historyPath.length - 1]?.content || 'Unknown prompt';
  return generateSimulationResponse(lastUserPrompt, historyPath.length);
}

export async function synthesizeBranches(
  pathA: ChatNode[],
  pathB: ChatNode[],
  selectedModel: string = 'gemini-2.5-flash-preview-09-2025',
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
