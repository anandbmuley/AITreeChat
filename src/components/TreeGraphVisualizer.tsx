import React, { useState } from 'react';
import { Network, GitFork, Terminal, Bot, User, ChevronDown, ChevronRight, Sparkles, Cpu } from 'lucide-react';
import { ChatNode } from '../types/chat';

interface TreeGraphVisualizerProps {
  rootIds: string[];
  nodes: Record<string, ChatNode>;
  activeThreadId: string | null;
  onOpenThread: (nodeId: string) => void;
  onInspectPath: (nodeId: string) => void;
  getPathToRoot: (nodeId: string) => ChatNode[];
  getReplyCount: (nodeId: string) => number;
}

export const TreeGraphVisualizer: React.FC<TreeGraphVisualizerProps> = ({
  rootIds,
  nodes,
  activeThreadId,
  onOpenThread,
  onInspectPath,
  getPathToRoot,
  getReplyCount,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Compute active highlighted path if a node is hovered
  const highlightedNodeIds = new Set(
    hoveredNodeId ? getPathToRoot(hoveredNodeId).map(n => n.id) : []
  );

  const renderTreeNode = (nodeId: string, level: number = 0) => {
    const node = nodes[nodeId];
    if (!node) return null;

    const isHovered = hoveredNodeId === node.id;
    const isHighlighted = highlightedNodeIds.has(node.id);
    const isSelectedThread = activeThreadId === node.id;
    const replyCount = getReplyCount(node.id);

    return (
      <div key={node.id} className="relative pl-6 my-3 tree-connector-line">
        <div
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          onClick={() => onOpenThread(node.id)}
          className={`p-4 rounded-2xl border transition-all duration-200 shadow-md cursor-pointer group/card ${
            isSelectedThread
              ? 'bg-indigo-950/90 border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-950/80'
              : isHighlighted
              ? 'bg-slate-800 border-indigo-400'
              : isHovered
              ? 'bg-slate-800/90 border-indigo-500/60 shadow-lg'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view hierarchy in Thread Panel"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${
                  node.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {node.role === 'user' ? 'U' : <Bot className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-xs font-semibold ${node.role === 'user' ? 'text-indigo-300' : 'text-emerald-400'}`}>
                {node.role === 'user' ? 'User' : 'AI Assistant'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                Depth {level}
              </span>
              {node.role === 'assistant' && node.metadata?.model && (() => {
                const modelId = node.metadata.model;
                const isPro = modelId.includes('pro');
                const is20 = modelId.includes('2.0');
                return (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1 border ${
                    isPro 
                      ? 'bg-indigo-950/90 border-indigo-700/80 text-indigo-300' 
                      : is20 
                      ? 'bg-cyan-950/90 border-cyan-700/80 text-cyan-300'
                      : 'bg-emerald-950/90 border-emerald-700/80 text-emerald-300'
                  }`}>
                    <Cpu className="w-3 h-3" />
                    {modelId.replace('gemini-', '')}
                  </span>
                );
              })()}
              {isSelectedThread && (
                <span className="text-[10px] bg-indigo-900/90 border border-indigo-500/80 text-indigo-200 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                  Active in Thread
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">{node.timestamp}</span>
          </div>

          <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed mb-3 font-sans group-hover/card:text-slate-100">
            {node.content}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenThread(node.id);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                  isSelectedThread
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/60'
                }`}
              >
                <GitFork className="w-3 h-3" />
                <span>
                  {isSelectedThread
                    ? 'Hierarchy Active'
                    : replyCount > 0
                    ? `${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}`
                    : 'View Hierarchy'}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectPath(node.id);
                }}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition"
              >
                <Terminal className="w-3 h-3" />
                <span>Path Trace</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              Children: {node.childrenIds.length}
            </span>
          </div>
        </div>

        {/* Recursive Children Nodes */}
        {node.childrenIds.length > 0 && (
          <div className="space-y-1 mt-1">
            {node.childrenIds.map(childId => renderTreeNode(childId, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden">
      
      {/* Visualizer Top Bar */}
      <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 select-none">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200 text-sm">Interactive Visual DAG Graph Map</h2>
            <p className="text-[11px] text-slate-400">Hierarchical Tree Structure & Node Connections</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> User Node
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> AI Node
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-400" /> Hover node to highlight root context path
          </span>
        </div>
      </div>

      {/* Graph Tree Container */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {rootIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
              <Network className="w-12 h-12 mb-3 text-indigo-400/40" />
              <p className="text-sm font-medium text-slate-300">Graph map is empty</p>
              <p className="text-xs text-slate-500 mt-1">Start a conversation in the Feed View to build a new graph visualizer.</p>
            </div>
          ) : (
            rootIds.map(rootId => (
              <div key={rootId} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                    <GitFork className="w-4 h-4" /> Level-0 Tree Root ({rootId})
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Sub-tree Nodes: {getReplyCount(rootId) + 1}
                  </span>
                </div>
                {renderTreeNode(rootId, 0)}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
