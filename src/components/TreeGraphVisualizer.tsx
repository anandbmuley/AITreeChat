import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Sparkles, Send, Cpu, Zap, Brain } from 'lucide-react';
import { ChatNode, TreeComplexityMetrics } from '../types/chat';
import { AVAILABLE_MODELS } from '../services/geminiApi';
import { useElkLayout } from '../hooks/useElkLayout';
import { ChatFlowNode, ChatFlowNodeExtraData, ChatFlowNodeType } from './graph/ChatFlowNode';

interface TreeGraphVisualizerProps {
  rootIds: string[];
  nodes: Record<string, ChatNode>;
  activeThreadId: string | null;
  isDark: boolean;
  searchQuery: string;
  isLoading: boolean;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  getMainLineNodes: () => ChatNode[];
  getComplexityForPath: (nodeId: string | null) => TreeComplexityMetrics;
  onSendMain: (content: string, modelOverride?: string) => Promise<void>;
  onOpenThread: (nodeId: string) => void;
  onInspectPath: (nodeId: string) => void;
  getPathToRoot: (nodeId: string) => ChatNode[];
  getReplyCount: (nodeId: string) => number;
}

const promptSuggestions = [
  "Design a scalable microservice architecture for AI data trees",
  "Compare trade-offs between Graph DBs and SQL for hierarchical trees",
  "Write a TypeScript algorithm to find lowest common ancestor in DAG",
  "Explain quantum superposition with interactive tree analogy"
];

const nodeTypes = { chatNode: ChatFlowNode };

export const TreeGraphVisualizer: React.FC<TreeGraphVisualizerProps> = ({
  rootIds,
  nodes,
  activeThreadId,
  isDark,
  searchQuery,
  isLoading,
  selectedModel,
  setSelectedModel,
  getMainLineNodes,
  getComplexityForPath,
  onSendMain,
  onOpenThread,
  onInspectPath,
  getPathToRoot,
  getReplyCount,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [nodeModelOverride, setNodeModelOverride] = useState<string>(selectedModel);
  const { nodes: layoutedNodes, edges: layoutedEdges } = useElkLayout(rootIds, nodes);
  const dataCacheRef = useRef(new Map<string, ChatFlowNodeExtraData>());

  useEffect(() => {
    setNodeModelOverride(selectedModel);
  }, [selectedModel]);

  const mainLineNodes = getMainLineNodes();
  const lastMainNode = mainLineNodes.length > 0 ? mainLineNodes[mainLineNodes.length - 1] : null;
  const complexity = getComplexityForPath(lastMainNode ? lastMainNode.id : null);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const contentToSend = inputValue;
    setInputValue('');
    await onSendMain(contentToSend, nodeModelOverride);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleHoverNode = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const highlightedNodeIds = useMemo(
    () => new Set(hoveredNodeId ? getPathToRoot(hoveredNodeId).map(n => n.id) : []),
    [hoveredNodeId, getPathToRoot]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const flowNodes = useMemo<ChatFlowNodeType[]>(() => {
    return layoutedNodes.map(n => {
      const node = n.data.node;
      const isDimmed = normalizedSearch.length > 0 && !node.content.toLowerCase().includes(normalizedSearch);
      const nextData: ChatFlowNodeExtraData = {
        node,
        depth: n.data.depth,
        isHovered: hoveredNodeId === node.id,
        isHighlighted: highlightedNodeIds.has(node.id),
        isSelectedThread: activeThreadId === node.id,
        isDimmed,
        replyCount: getReplyCount(node.id),
        onOpenThread,
        onInspectPath,
        onHoverNode: handleHoverNode,
      };

      const cached = dataCacheRef.current.get(node.id);
      const isSame =
        cached &&
        cached.node === nextData.node &&
        cached.depth === nextData.depth &&
        cached.isHovered === nextData.isHovered &&
        cached.isHighlighted === nextData.isHighlighted &&
        cached.isSelectedThread === nextData.isSelectedThread &&
        cached.isDimmed === nextData.isDimmed &&
        cached.replyCount === nextData.replyCount;

      const data = isSame ? cached! : nextData;
      dataCacheRef.current.set(node.id, data);

      return {
        ...n,
        data,
        zIndex: hoveredNodeId === node.id ? 1000 : undefined,
      } as ChatFlowNodeType;
    });
  }, [
    layoutedNodes,
    hoveredNodeId,
    highlightedNodeIds,
    activeThreadId,
    normalizedSearch,
    getReplyCount,
    onOpenThread,
    onInspectPath,
    handleHoverNode,
  ]);

  const edges = useMemo<Edge[]>(() => {
    return layoutedEdges.map(edge => {
      const isMainEdge = !!edge.animated;
      const isEdgeHighlighted = highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target);
      return {
        ...edge,
        style: {
          stroke: isEdgeHighlighted ? '#6366f1' : isMainEdge ? '#6366f1' : isDark ? '#475569' : '#cbd5e1',
          strokeWidth: isMainEdge || isEdgeHighlighted ? 2.5 : 1.5,
        },
      };
    });
  }, [layoutedEdges, highlightedNodeIds, isDark]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 h-full overflow-hidden transition-colors duration-200">

      {/* Visualizer Top Bar */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/60 select-none">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">Interactive Visual DAG Graph Map</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Hierarchical Tree Structure & Node Connections</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> User Node
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> AI Node
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-500" /> Hover node to highlight root context path
          </span>
        </div>
      </div>

      {/* Graph Flow Canvas */}
      <div className="flex-1 min-h-0">
        {rootIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-slate-500">
            <Network className="w-12 h-12 mb-3 text-indigo-400/40" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Graph map is empty</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Send a message below to start building the tree.</p>
          </div>
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              nodes={flowNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              colorMode={isDark ? 'dark' : 'light'}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable={false}
              minZoom={0.2}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} />
              <Controls />
              <MiniMap
                nodeColor={(n) => {
                  const role = (n.data as unknown as ChatFlowNodeExtraData).node?.role;
                  return role === 'user' ? '#6366f1' : '#10b981';
                }}
                pannable
                zoomable
              />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>

      {/* Main Message Compose Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/60 backdrop-blur">
        <div className="max-w-4xl mx-auto space-y-3">

          {/* Complexity Indicator & Model Selector */}
          <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider flex-shrink-0 flex items-center gap-1 border ${
                complexity.tier === 'low'
                  ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80'
                  : complexity.tier === 'medium'
                  ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80'
                  : 'bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800/80'
              }`}>
                {complexity.tier === 'low' ? <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> :
                 complexity.tier === 'medium' ? <Cpu className="w-3 h-3 text-amber-600 dark:text-amber-400" /> :
                 <Brain className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                {complexity.tier} Complexity (Score: {complexity.score})
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate hidden sm:inline" title={complexity.reason}>
                {complexity.reason}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium hidden md:inline">
                Model for this node:
              </span>
              <select
                value={nodeModelOverride}
                onChange={(e) => setNodeModelOverride(e.target.value)}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/90 hover:border-indigo-500 text-xs text-indigo-700 dark:text-indigo-200 rounded-lg px-2.5 py-1 outline-none font-semibold transition cursor-pointer shadow-sm"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.badge}){model.id === complexity.recommendedModelId ? ' ★ Recommended' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          {mainLineNodes.length === 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-amber-500" /> Try prompt:
              </span>
              {promptSuggestions.map((suggestion, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setInputValue(suggestion)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex items-center">
            <textarea
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send message in main conversation stream... (Press Enter to submit)"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 focus:border-indigo-500 rounded-2xl py-3 pl-4 pr-14 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none transition shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-3 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition shadow-md shadow-indigo-600/30"
              title={`Send using ${AVAILABLE_MODELS.find(m => m.id === nodeModelOverride)?.name || nodeModelOverride}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
            <span>Will generate AI response using <strong>{AVAILABLE_MODELS.find(m => m.id === nodeModelOverride)?.name}</strong></span>
            <span>Shift + Enter for new line</span>
          </div>

        </div>
      </div>

    </div>
  );
};
