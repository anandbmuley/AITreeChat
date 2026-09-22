import React, { memo } from 'react';
import { Handle, Node, NodeProps, Position } from '@xyflow/react';
import { GitFork, Terminal, Bot, Cpu } from 'lucide-react';
import { ChatFlowNodeData, NODE_HEIGHT, NODE_WIDTH } from '../../hooks/useElkLayout';
import { MarkdownRenderer } from '../MarkdownRenderer';

export interface ChatFlowNodeExtraData extends ChatFlowNodeData {
  isHovered: boolean;
  isHighlighted: boolean;
  isSelectedThread: boolean;
  isDimmed: boolean;
  replyCount: number;
  onOpenThread: (nodeId: string) => void;
  onInspectPath: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
}

export type ChatFlowNodeType = Node<ChatFlowNodeExtraData, 'chatNode'>;

function ChatFlowNodeComponent({ data }: NodeProps<ChatFlowNodeType>) {
  const {
    node,
    depth,
    isHovered,
    isHighlighted,
    isSelectedThread,
    isDimmed,
    replyCount,
    onOpenThread,
    onInspectPath,
    onHoverNode,
  } = data;

  return (
    <div
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
      className={`overflow-visible transition-opacity duration-200 ${isDimmed ? 'opacity-30' : 'opacity-100'} ${isHovered ? 'z-50' : 'z-0'}`}
      onMouseEnter={() => onHoverNode(node.id)}
      onMouseLeave={() => onHoverNode(null)}
      onClick={() => onOpenThread(node.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 dark:!bg-slate-600 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 dark:!bg-slate-600 !w-2 !h-2 !border-0" />

      <div
        style={{ minHeight: NODE_HEIGHT }}
        className={`w-full p-4 rounded-2xl border transition-all duration-200 ease-out origin-center shadow-md cursor-pointer group/card flex flex-col ${
          isHovered ? 'scale-110 shadow-2xl' : 'scale-100'
        } ${
          isSelectedThread
            ? 'bg-indigo-50 dark:bg-indigo-950/90 border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-950/80'
            : isHighlighted
            ? 'bg-slate-100 dark:bg-slate-800 border-indigo-400'
            : isHovered
            ? node.role === 'user'
              ? 'bg-indigo-100/95 dark:bg-indigo-900/95 border-indigo-400 dark:border-indigo-500/60'
              : 'bg-emerald-100/95 dark:bg-emerald-900/95 border-emerald-400 dark:border-emerald-500/60'
            : node.role === 'user'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-300 dark:hover:border-indigo-700'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-300 dark:hover:border-emerald-700'
        }`}
        title="Click to view hierarchy in Thread Panel"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-6 h-6 flex-shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${
                node.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {node.role === 'user' ? 'U' : <Bot className="w-3.5 h-3.5" />}
            </div>
            <span className={`text-xs font-semibold truncate ${node.role === 'user' ? 'text-indigo-600 dark:text-indigo-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {node.role === 'user' ? 'User' : 'AI Assistant'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 flex-shrink-0">
              Depth {depth}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">{node.timestamp}</span>
        </div>

        {node.role === 'assistant' && node.metadata?.model && (() => {
          const modelId = node.metadata.model;
          const isPro = modelId.includes('pro');
          const is20 = modelId.includes('2.0');
          return (
            <span className={`self-start mb-2 text-[10px] px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1 border ${
              isPro
                ? 'bg-indigo-50 dark:bg-indigo-950/90 border-indigo-200 dark:border-indigo-700/80 text-indigo-700 dark:text-indigo-300'
                : is20
                ? 'bg-cyan-50 dark:bg-cyan-950/90 border-cyan-200 dark:border-cyan-700/80 text-cyan-700 dark:text-cyan-300'
                : 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-700/80 text-emerald-700 dark:text-emerald-300'
            }`}>
              <Cpu className="w-3 h-3" />
              {modelId.replace('gemini-', '')}
            </span>
          );
        })()}

        <div
          className={`mb-3 flex-1 transition-all duration-200 ${isHovered ? '' : 'max-h-16 overflow-hidden'}`}
        >
          <MarkdownRenderer content={node.content} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] mt-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenThread(node.id);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                isSelectedThread
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700/60'
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
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
    </div>
  );
}

export const ChatFlowNode = memo(ChatFlowNodeComponent);
