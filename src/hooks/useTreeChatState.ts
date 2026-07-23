import { useState, useCallback } from 'react';
import { ChatNode, ViewMode } from '../types/chat';
import { callGeminiAPI, AVAILABLE_MODELS, calculatePathComplexity } from '../services/geminiApi';

const getTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const INITIAL_NODES: Record<string, ChatNode> = {
  "node-1": {
    id: "node-1",
    parentId: null,
    childrenIds: ["node-2"],
    role: "user",
    content: "We are designing a modern microservices architecture for an e-commerce platform. What are 3 core patterns we should evaluate?",
    timestamp: "10:00 AM",
    metadata: { isMain: true }
  },
  "node-2": {
    id: "node-2",
    parentId: "node-1",
    childrenIds: ["node-3", "node-5"],
    role: "assistant",
    content: "Here are 3 fundamental microservices design patterns to evaluate:\n\n1. **Event-Driven Architecture (EDA)** - Decouples services using message brokers like Kafka/RabbitMQ.\n2. **API Gateway Pattern** - Single entry point for routing, authentication, and rate limiting.\n3. **Database-per-Service** - Ensures loose coupling by isolating database instances per domain.",
    timestamp: "10:01 AM",
    metadata: { model: "gemini-2.5-flash", isMain: true }
  },
  "node-3": {
    id: "node-3",
    parentId: "node-2",
    childrenIds: ["node-4"],
    role: "user",
    content: "Let's dive deeper into Event-Driven Architecture. How do we ensure idempotent message processing?",
    timestamp: "10:05 AM"
  },
  "node-4": {
    id: "node-4",
    parentId: "node-3",
    childrenIds: [],
    role: "assistant",
    content: "To guarantee idempotency in Event-Driven systems:\n\n* **Unique Message IDs:** Tag every published event with a UUID.\n* **Idempotency Key Database:** Consumers store processed message IDs in a transactional cache (e.g. Redis).\n* **Outbox Pattern:** Atomically write database updates and event logs within the same transaction.",
    timestamp: "10:06 AM",
    metadata: { model: "gemini-2.5-flash" }
  },
  "node-5": {
    id: "node-5",
    parentId: "node-2",
    childrenIds: [],
    role: "user",
    content: "What about API Gateway pattern? Should we build our own or use standard solutions like Kong/Envoy?",
    timestamp: "10:12 AM"
  }
};

const INITIAL_ROOT_IDS = ["node-1"];

export function useTreeChatState() {
  const [nodes, setNodes] = useState<Record<string, ChatNode>>(INITIAL_NODES);
  const [rootIds, setRootIds] = useState<string[]>(INITIAL_ROOT_IDS);
  const [activeThreadNodeId, setActiveThreadNodeId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('feed');
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Context Path Assembly: Root -> Parent -> Target
  const getPathToRoot = useCallback((targetNodeId: string): ChatNode[] => {
    const path: ChatNode[] = [];
    let currentId: string | null = targetNodeId;

    while (currentId && nodes[currentId]) {
      const currentNode: ChatNode = nodes[currentId];
      path.unshift(currentNode);
      currentId = currentNode.parentId;
    }

    return path;
  }, [nodes]);

  // Helper to retrieve the linear main line path nodes
  const getMainLineNodes = useCallback((): ChatNode[] => {
    const mainNodes: ChatNode[] = [];
    if (rootIds.length === 0) return mainNodes;

    let currentId: string | null = rootIds.find(id => nodes[id]?.metadata?.isMain) || rootIds[0] || null;

    while (currentId && nodes[currentId]) {
      const currentNode: ChatNode = nodes[currentId];
      mainNodes.push(currentNode);

      const mainChildId: string | undefined = currentNode.childrenIds.find(
        childId => nodes[childId]?.metadata?.isMain
      );
      currentId = mainChildId || null;
    }

    return mainNodes;
  }, [nodes, rootIds]);

  // Extract descendant sub-tree for a thread parent node (excluding main line continuations)
  const getThreadDescendants = useCallback((parentNodeId: string): ChatNode[] => {
    const thread: ChatNode[] = [];

    const collectPath = (currId: string): void => {
      const currNode: ChatNode | undefined = nodes[currId];
      if (!currNode) return;

      currNode.childrenIds.forEach(childId => {
        const child: ChatNode | undefined = nodes[childId];
        if (child && !child.metadata?.isMain) {
          thread.push(child);
          collectPath(child.id);
        }
      });
    };

    const parentNode: ChatNode | undefined = nodes[parentNodeId];
    if (parentNode) {
      parentNode.childrenIds.forEach(childId => {
        const child: ChatNode | undefined = nodes[childId];
        if (child && !child.metadata?.isMain) {
          thread.push(child);
          collectPath(child.id);
        }
      });
    }

    return thread;
  }, [nodes]);

  // Count total thread reply count in sub-tree
  const getReplyCount = useCallback((nodeId: string): number => {
    return getThreadDescendants(nodeId).length;
  }, [getThreadDescendants]);

  // Extract distinct branch sub-trees originating directly from a parent node
  const getBranchesForNode = useCallback((parentNodeId: string): { branchId: string; rootNode: ChatNode; nodes: ChatNode[] }[] => {
    const parentNode = nodes[parentNodeId];
    if (!parentNode) return [];

    const directChildIds = parentNode.childrenIds.filter(childId => !nodes[childId]?.metadata?.isMain);

    return directChildIds.map((childId, index) => {
      const rootNode = nodes[childId];
      const branchNodes: ChatNode[] = [];

      if (rootNode) {
        branchNodes.push(rootNode);

        const collectSubTree = (currId: string) => {
          const curr = nodes[currId];
          if (!curr) return;
          curr.childrenIds.forEach(cId => {
            const child = nodes[cId];
            if (child && !child.metadata?.isMain) {
              branchNodes.push(child);
              collectSubTree(child.id);
            }
          });
        };

        collectSubTree(childId);
      }

      return {
        branchId: `branch-${index + 1}`,
        rootNode,
        nodes: branchNodes
      };
    });
  }, [nodes]);

  // Get leaf nodes (nodes with 0 children) for synthesis
  const getLeafNodes = useCallback((): ChatNode[] => {
    return Object.values(nodes).filter(node => node.childrenIds.length === 0);
  }, [nodes]);

  // Get Complexity Metrics for a target node or main line path
  const getComplexityForPath = useCallback((targetNodeId: string | null = null) => {
    const historyPath = targetNodeId ? getPathToRoot(targetNodeId) : getMainLineNodes();
    const branchCount = targetNodeId ? getBranchesForNode(targetNodeId).length : 0;
    return calculatePathComplexity(historyPath, branchCount);
  }, [getPathToRoot, getMainLineNodes, getBranchesForNode]);

  // Send Main Stream Message (Chains to linear main line)
  const sendMainMessage = async (content: string, modelOverride?: string) => {
    if (!content.trim() || isLoading) return;

    const targetModel = modelOverride || selectedModel;

    const mainNodes = getMainLineNodes();
    const lastMainNode = mainNodes.length > 0 ? mainNodes[mainNodes.length - 1] : null;
    const parentId = lastMainNode ? lastMainNode.id : null;

    const userNodeId = `node-${Date.now()}`;
    const userNode: ChatNode = {
      id: userNodeId,
      parentId: parentId,
      childrenIds: [],
      role: 'user',
      content: content.trim(),
      timestamp: getTimestamp(),
      metadata: { isMain: true }
    };

    setNodes(prev => {
      const next = { ...prev, [userNodeId]: userNode };
      if (parentId && prev[parentId]) {
        next[parentId] = {
          ...prev[parentId],
          childrenIds: [...(prev[parentId].childrenIds || []), userNodeId]
        };
      }
      return next;
    });

    if (!parentId) {
      setRootIds(prev => [...prev, userNodeId]);
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const historyPath = parentId ? [...getPathToRoot(parentId), userNode] : [userNode];
      const aiResponseContent = await callGeminiAPI(historyPath, targetModel, apiKey);

      const aiNodeId = `node-${Date.now() + 1}`;
      const aiNode: ChatNode = {
        id: aiNodeId,
        parentId: userNodeId,
        childrenIds: [],
        role: 'assistant',
        content: aiResponseContent,
        timestamp: getTimestamp(),
        metadata: { model: targetModel, isMain: true }
      };

      setNodes(prev => ({
        ...prev,
        [userNodeId]: { ...prev[userNodeId], childrenIds: [aiNodeId] },
        [aiNodeId]: aiNode
      }));
    } catch (error: any) {
      console.error("Failed to generate main response:", error);
      const errMsg = error?.message || "An error occurred while communicating with Gemini API.";
      setApiError(errMsg);
      alert(`Gemini API Error:\n\n${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Send Thread Message (Offloaded Fork)
  const sendThreadMessage = async (content: string, modelOverride?: string) => {
    if (!content.trim() || !activeThreadNodeId || isLoading) return;

    const targetModel = modelOverride || selectedModel;

    const parentPath = getPathToRoot(activeThreadNodeId);
    const parentNode = parentPath[parentPath.length - 1];

    const userNodeId = `node-${Date.now()}`;
    const userNode: ChatNode = {
      id: userNodeId,
      parentId: parentNode.id,
      childrenIds: [],
      role: 'user',
      content: content.trim(),
      timestamp: getTimestamp()
    };

    setNodes(prev => {
      const updatedParent = {
        ...prev[parentNode.id],
        childrenIds: [...(prev[parentNode.id]?.childrenIds || []), userNodeId]
      };
      return { ...prev, [parentNode.id]: updatedParent, [userNodeId]: userNode };
    });

    setIsLoading(true);
    setApiError(null);

    try {
      const fullHistoryPath = [...parentPath, userNode];
      const aiResponseContent = await callGeminiAPI(fullHistoryPath, targetModel, apiKey);

      const aiNodeId = `node-${Date.now() + 1}`;
      const aiNode: ChatNode = {
        id: aiNodeId,
        parentId: userNodeId,
        childrenIds: [],
        role: 'assistant',
        content: aiResponseContent,
        timestamp: getTimestamp(),
        metadata: { model: targetModel }
      };

      setNodes(prev => ({
        ...prev,
        [userNodeId]: { ...prev[userNodeId], childrenIds: [aiNodeId] },
        [aiNodeId]: aiNode
      }));
    } catch (error: any) {
      console.error("Failed to generate thread response:", error);
      const errMsg = error?.message || "An error occurred while communicating with Gemini API.";
      setApiError(errMsg);
      alert(`Gemini API Error:\n\n${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openThread = (nodeId: string) => {
    const targetNode = nodes[nodeId];
    if (targetNode) {
      setActiveThreadNodeId(nodeId);
    }
  };
  const closeThread = () => setActiveThreadNodeId(null);
  const inspectNodePath = (nodeId: string | null) => setInspectedNodeId(nodeId);

  const exportGraph = () => {
    const data = JSON.stringify({ rootIds, nodes }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-tree-chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importGraph = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.nodes && parsed.rootIds) {
        setNodes(parsed.nodes);
        setRootIds(parsed.rootIds);
        setActiveThreadNodeId(null);
        return true;
      }
    } catch (e) {
      console.error("Invalid graph JSON format", e);
    }
    return false;
  };

  const resetGraph = () => {
    setNodes(INITIAL_NODES);
    setRootIds(INITIAL_ROOT_IDS);
    setActiveThreadNodeId(null);
    setInspectedNodeId(null);
    setApiError(null);
  };

  const startNewSession = useCallback(() => {
    setNodes({});
    setRootIds([]);
    setActiveThreadNodeId(null);
    setInspectedNodeId(null);
    setSearchQuery('');
    setApiError(null);
  }, []);

  return {
    nodes,
    rootIds,
    activeThreadNodeId,
    activeViewMode,
    selectedModel,
    apiKey,
    isLoading,
    apiError,
    setApiError,
    inspectedNodeId,
    searchQuery,
    getPathToRoot,
    getMainLineNodes,
    getThreadDescendants,
    getBranchesForNode,
    getReplyCount,
    getLeafNodes,
    getComplexityForPath,
    sendMainMessage,
    sendThreadMessage,
    openThread,
    closeThread,
    inspectNodePath,
    setSelectedModel,
    setApiKey,
    setActiveViewMode,
    setSearchQuery,
    exportGraph,
    importGraph,
    resetGraph,
    startNewSession
  };
}

