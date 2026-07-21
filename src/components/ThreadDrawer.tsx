import React, { useState, useRef, useEffect } from 'react';
import { 
  GitFork, 
  X, 
  ChevronRight, 
  ChevronDown,
  Terminal, 
  Send, 
  Bot, 
  User, 
  CornerDownRight, 
  RefreshCw,
  Info,
  Layers,
  History
} from 'lucide-react';
import { ChatNode } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ThreadDrawerProps {
  activeThreadId: string;
  nodes: Record<string, ChatNode>;
  isLoading: boolean;
  getPathToRoot: (nodeId: string) => ChatNode[];
  getThreadDescendants: (nodeId: string) => ChatNode[];
  onSendThread: (content: string) => Promise<void>;
  onCloseThread: () => void;
  onInspectPath: (nodeId: string) => void;
}

export const ThreadDrawer: React.FC<ThreadDrawerProps> = ({
  activeThreadId,
  nodes,
  isLoading,
  getPathToRoot,
  getThreadDescendants,
  onSendThread,
  onCloseThread,
  onInspectPath,
}) => {
  const [threadInputValue, setThreadInputValue] = useState('');
  const [showAncestors, setShowAncestors] = useState(true);
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const activeAnchorNode = nodes[activeThreadId];
  const activeThreadPath = getPathToRoot(activeThreadId);
  const ancestorNodes = activeThreadPath.slice(0, activeThreadPath.length - 1);
  const activeThreadMessages = getThreadDescendants(activeThreadId);

  // Auto scroll thread view on updates
  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight;
    }
  }, [activeThreadId, activeThreadMessages.length]);

  const handleSend = () => {
    if (threadInputValue.trim() && !isLoading) {
      onSendThread(threadInputValue);
      setThreadInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeAnchorNode) return null;

  return (
    <div className="w-full md:w-[520px] bg-slate-950 border-l border-slate-800 flex flex-col h-full shadow-2xl relative z-20 animate-fade-in select-none">
      
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/90 backdrop-blur z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-950 border border-indigo-800/80 rounded-xl text-indigo-400 shadow-sm">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              Thread Branch & Hierarchy
            </h3>
            <span className="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
              <span>Full Path Depth: {activeThreadPath.length} nodes</span>
              <span>•</span>
              <span>{ancestorNodes.length} Ancestors</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onInspectPath(activeThreadId)}
            title="Inspect full context path payload sent to LLM"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={onCloseThread}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Close Thread Side Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Path Breadcrumb Trail */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-400 scrollbar-thin">
        <span className="text-slate-500 font-medium flex items-center gap-1 flex-shrink-0">
          <Layers className="w-3 h-3 text-indigo-400" /> Hierarchy:
        </span>
        {activeThreadPath.map((node, index) => {
          const isAnchor = index === activeThreadPath.length - 1;
          return (
            <React.Fragment key={node.id}>
              {index > 0 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
              <button
                onClick={() => onInspectPath(node.id)}
                className={`truncate max-w-[130px] px-2 py-0.5 rounded transition text-left flex-shrink-0 ${
                  isAnchor
                    ? 'bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 font-semibold'
                    : 'bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400'
                }`}
                title={`Level ${index} (${node.role}): ${node.content}`}
              >
                <span className="font-mono text-[10px] opacity-75 mr-1">L{index}</span>
                <span>{node.role === 'user' ? 'U' : 'AI'}: {node.content.slice(0, 14)}...</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Content Scroll Area */}
      <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Section 1: Complete Ancestor Context Hierarchy */}
        {ancestorNodes.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAncestors(!showAncestors)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-xl transition"
            >
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ancestor Context Hierarchy ({ancestorNodes.length} Nodes)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-normal">
                <span>{showAncestors ? 'Hide History' : 'Show Full Chain'}</span>
                {showAncestors ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showAncestors && (
              <div className="space-y-3 pl-2 border-l-2 border-slate-800/80 ml-2">
                {ancestorNodes.map((ancestor, index) => (
                  <div
                    key={ancestor.id}
                    className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 text-xs space-y-1.5 transition hover:border-slate-700/60 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${
                            ancestor.role === 'user' ? 'bg-indigo-600/80' : 'bg-emerald-600/80'
                          }`}
                        >
                          {ancestor.role === 'user' ? 'U' : <Bot className="w-3 h-3" />}
                        </span>
                        <span className={`font-semibold text-[11px] ${ancestor.role === 'user' ? 'text-indigo-300' : 'text-emerald-400'}`}>
                          {ancestor.role === 'user' ? 'User Prompt' : 'AI Response'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800/80">
                          Level {index}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{ancestor.timestamp}</span>
                        <button
                          onClick={() => onInspectPath(ancestor.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-200 transition"
                          title="Inspect ancestor payload"
                        >
                          <Terminal className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-slate-300 text-xs leading-relaxed font-sans">
                      <MarkdownRenderer content={ancestor.content} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: Anchor Parent Node Card (Fork Target) */}
        <div className="relative mt-2">
          <div className="absolute -top-3 left-4 bg-indigo-900/90 border border-indigo-700/80 text-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
            <GitFork className="w-3 h-3 text-indigo-300" />
            <span>Fork Anchor Point (Branch Target)</span>
          </div>

          <div className="bg-slate-900/90 border-2 border-indigo-600/80 rounded-2xl p-4 pt-5 shadow-lg shadow-indigo-950/40 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  AI Assistant Response
                </span>
                {activeAnchorNode.metadata?.model && (
                  <span className="text-[10px] bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                    {activeAnchorNode.metadata.model.replace('gemini-', '')}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{activeAnchorNode.timestamp}</span>
            </div>

            <div className="text-slate-100 text-xs leading-relaxed font-sans">
              <MarkdownRenderer content={activeAnchorNode.content} />
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400">
              <span className="text-indigo-300 font-medium">Forks history into new sub-thread</span>
              <span className="font-mono text-slate-500">ID: {activeAnchorNode.id}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Fork Branch Replies Divider */}
        <div className="flex items-center gap-2 my-4 text-[11px] text-slate-400">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="flex items-center gap-1.5 font-semibold text-slate-300 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" /> Branch Continuations ({activeThreadMessages.length})
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Section 4: Nested Thread Messages */}
        {activeThreadMessages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs space-y-2 bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4">
            <GitFork className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
            <p className="font-medium text-slate-400">No replies in this branch yet.</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Submitting a message below will create a new branch response attached to this anchor while preserving full ancestor history context.
            </p>
          </div>
        ) : (
          activeThreadMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2.5 animate-fade-in">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`flex-1 rounded-xl p-3.5 text-xs border ${
                  msg.role === 'user'
                    ? 'bg-slate-800/90 border-slate-700 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-semibold ${msg.role === 'user' ? 'text-indigo-300' : 'text-emerald-400'}`}>
                    {msg.role === 'user' ? 'User' : 'AI Assistant'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                </div>

                <MarkdownRenderer content={msg.content} />
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-3 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Generating response for this branch...</span>
          </div>
        )}

      </div>

      {/* Input Box Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="relative flex items-center">
          <input
            type="text"
            value={threadInputValue}
            onChange={(e) => setThreadInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in branch thread (forks history)..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-100 placeholder-slate-500 outline-none transition shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!threadInputValue.trim() || isLoading}
            className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition shadow-md shadow-indigo-600/30"
            title="Send branch reply"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-indigo-400" /> Dispatches {activeThreadPath.length} ancestor nodes as context
          </span>
          <span>Press Enter to send</span>
        </div>
      </div>

    </div>
  );
};

