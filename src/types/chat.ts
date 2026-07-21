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

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
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
