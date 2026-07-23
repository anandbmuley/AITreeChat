export type MessageRole = 'user' | 'assistant' | 'system';

export interface NodeMetadata {
  model?: string;
  tokens?: number;
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

export type ViewMode = 'feed' | 'visualizer';

export type ComplexityTier = 'low' | 'medium' | 'high';

export interface TreeComplexityMetrics {
  score: number;
  tier: ComplexityTier;
  recommendedModelId: string;
  depth: number;
  estimatedTokens: number;
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
  totalPayloadTokensEstimate: number;
}

