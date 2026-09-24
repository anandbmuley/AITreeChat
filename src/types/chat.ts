export type MessageRole = 'user' | 'assistant' | 'system';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface NodeMetadata {
  model?: string;
  /** Token usage reported by the LLM API for the request that produced this (assistant) node. */
  usage?: TokenUsage;
  forkTitle?: string;
  archived?: boolean;
  isMain?: boolean;
}

export interface ChatNode {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: NodeMetadata;
}

export interface ConversationGraph {
  rootIds: string[];
  nodes: Record<string, ChatNode>;
  activeThreadNodeId: string | null;
}

export type ComplexityTier = 'low' | 'medium' | 'high';

export interface TreeComplexityMetrics {
  score: number;
  tier: ComplexityTier;
  recommendedModelId: string;
  depth: number;
  /** Cumulative tokens for the path, as reported by the LLM API (0 if none reported yet). */
  totalTokens: number;
  branchCount: number;
  reason: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  tier: ComplexityTier;
  speed: string;
  reasoning: string;
}

export interface SynthesisRequest {
  nodeIdA: string;
  nodeIdB: string;
}

export interface PathInspectionData {
  targetNodeId: string;
  pathNodes: ChatNode[];
}

