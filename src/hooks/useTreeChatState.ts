import { useState, useCallback } from 'react';
import { ChatNode, ViewMode } from '../types/chat';
import { callGeminiAPI, AVAILABLE_MODELS } from '../services/geminiApi';

const getTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const INITIAL_NODES: Record<string, ChatNode> = {
  "node-1": {
    id: "node-1",
    parentId: null,
    childrenIds: ["node-2"],
    role: "user",
    content: "We are designing a modern microservices architecture for an e-commerce platform. What are 3 core patterns we should evaluate?",
    timestamp: "10:00 AM"
  },
  "node-2": {
    id: "node-2",
    parentId: "node-1",
    childrenIds: ["node-3", "node-5"],
    role: "assistant",
    content: "Here are 3 fundamental microservices design patterns to evaluate:\n\n1. **Event-Driven Architecture (EDA)** - Decouples services using message brokers like Kafka/RabbitMQ.\n2. **API Gateway Pattern** - Single entry point for routing, authentication, and rate limiting.\n3. **Database-per-Service** - Ensures loose coupling by isolating database instances per domain.",
    timestamp: "10:01 AM",
    metadata: { model: "gemini-2.5-flash-preview-09-2025" }
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
    metadata: { model: "gemini-2.5-flash-preview-09-2025" }
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

  // Extract descendant sub-tree for a thread parent node
  const getThreadDescendants = useCallback((parentNodeId: string): ChatNode[] => {
    const thread: ChatNode[] = [];

    const collectPath = (currId: string): void => {
      const currNode: ChatNode | undefined = nodes[currId];
      if (!currNode) return;

      currNode.childrenIds.forEach(childId => {
        const child: ChatNode | undefined = nodes[childId];
        if (child) {
          thread.push(child);
          collectPath(child.id);
        }
      });
    };

    const parentNode: ChatNode | undefined = nodes[parentNodeId];
    if (parentNode) {
      parentNode.childrenIds.forEach(childId => {
        const child: ChatNode | undefined = nodes[childId];
        if (child) {
          thread.push(child);
          collectPath(child.id);
        }
      });
    }

    return thread;
  }, [nodes]);

  // Count total reply count in sub-tree
  const getReplyCount = useCallback((nodeId: string): number => {
    let count = 0;
    const countChildren = (id: string): void => {
      const nodeToCount: ChatNode | undefined = nodes[id];
      if (nodeToCount && nodeToCount.childrenIds) {
        count += nodeToCount.childrenIds.length;
        nodeToCount.childrenIds.forEach(countChildren);
      }
    };
    countChildren(nodeId);
    return count;
  }, [nodes]);

  // Get leaf nodes (nodes with 0 children) for synthesis
  const getLeafNodes = useCallback((): ChatNode[] => {
    return Object.values(nodes).filter(node => node.childrenIds.length === 0);
  }, [nodes]);

  // Send Main Stream Message (Level 0)
  const sendMainMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userNodeId = `node-${Date.now()}`;
    const userNode: ChatNode = {
      id: userNodeId,
      parentId: null,
      childrenIds: [],
      role: 'user',
      content: content.trim(),
      timestamp: getTimestamp()
    };

    setNodes(prev => ({ ...prev, [userNodeId]: userNode }));
    setRootIds(prev => [...prev, userNodeId]);
    setIsLoading(true);

    try {
      const historyPath = [userNode];
      const aiResponseContent = await callGeminiAPI(historyPath, selectedModel, apiKey);

      const aiNodeId = `node-${Date.now() + 1}`;
      const aiNode: ChatNode = {
        id: aiNodeId,
        parentId: userNodeId,
        childrenIds: [],
        role: 'assistant',
        content: aiResponseContent,
        timestamp: getTimestamp(),
        metadata: { model: selectedModel }
      };

      setNodes(prev => ({
        ...prev,
        [userNodeId]: { ...prev[userNodeId], childrenIds: [aiNodeId] },
        [aiNodeId]: aiNode
      }));
    } catch (error) {
      console.error("Failed to generate main response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send Thread Message (Offloaded Fork)
  const sendThreadMessage = async (content: string) => {
    if (!content.trim() || !activeThreadNodeId || isLoading) return;

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

    try {
      const fullHistoryPath = [...parentPath, userNode];
      const aiResponseContent = await callGeminiAPI(fullHistoryPath, selectedModel, apiKey);

      const aiNodeId = `node-${Date.now() + 1}`;
      const aiNode: ChatNode = {
        id: aiNodeId,
        parentId: userNodeId,
        childrenIds: [],
        role: 'assistant',
        content: aiResponseContent,
        timestamp: getTimestamp(),
        metadata: { model: selectedModel }
      };

      setNodes(prev => ({
        ...prev,
        [userNodeId]: { ...prev[userNodeId], childrenIds: [aiNodeId] },
        [aiNodeId]: aiNode
      }));
    } catch (error) {
      console.error("Failed to generate thread response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openThread = (nodeId: string) => setActiveThreadNodeId(nodeId);
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
  };

  const startNewSession = useCallback(() => {
    setNodes({});
    setRootIds([]);
    setActiveThreadNodeId(null);
    setInspectedNodeId(null);
    setSearchQuery('');
  }, []);

  return {
    nodes,
    rootIds,
    activeThreadNodeId,
    activeViewMode,
    selectedModel,
    apiKey,
    isLoading,
    inspectedNodeId,
    searchQuery,
    getPathToRoot,
    getThreadDescendants,
    getReplyCount,
    getLeafNodes,
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
