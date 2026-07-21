import React, { useState, useRef, useEffect } from 'react';
import { 
  GitFork, 
  X, 
  ChevronRight, 
  Terminal, 
  Send, 
  Bot, 
  User, 
  CornerDownRight, 
  RefreshCw,
  Info
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
  const threadScrollRef = useRef<HTMLDivElement>(null);

  const activeAnchorNode = nodes[activeThreadId];
  const activeThreadPath = getPathToRoot(activeThreadId);
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
    <div className="w-full md:w-[480px] bg-slate-950 border-l border-slate-800 flex flex-col h-full shadow-2xl relative z-20 animate-fade-in select-none">
      
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-indigo-950 border border-indigo-800 rounded-lg text-indigo-400">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              Thread Side-Drawer
            </h3>
            <span className="text-[10px] text-indigo-300 font-mono">
              Branch Depth: {activeThreadPath.length} nodes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onInspectPath(activeThreadId)}
            title="Inspect context path payload sent to LLM"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={onCloseThread}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Close Thread"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Path Hierarchy Trail */}
      <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto text-[11px] text-slate-400">
        <span className="text-slate-500 font-medium">Path:</span>
        {activeThreadPath.map((node, index) => (
          <React.Fragment key={node.id}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
            <span
              className={`truncate max-w-[120px] cursor-pointer hover:underline ${
                index === activeThreadPath.length - 1 ? 'text-indigo-300 font-semibold' : 'text-slate-400'
              }`}
              onClick={() => onInspectPath(node.id)}
              title={`Click to inspect node: ${node.content}`}
            >
              {node.role === 'user' ? 'U' : 'AI'}: {node.content.slice(0, 16)}...
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Main Thread Content Scroll */}
      <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Anchor Parent Node Card */}
        <div className="bg-slate-900/90 border border-indigo-900/60 rounded-2xl p-4 shadow-inner relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-emerald-400" /> Thread Anchor Node
            </span>
            <span className="text-[11px] text-slate-400 font-mono">{activeAnchorNode.timestamp}</span>
          </div>

          <div className="text-slate-200 text-xs leading-relaxed">
            <MarkdownRenderer content={activeAnchorNode.content} />
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400">
            <span>Parent for all replies in this fork</span>
            <span className="font-mono text-indigo-400">ID: {activeAnchorNode.id}</span>
          </div>
        </div>

        {/* Fork Divider */}
        <div className="flex items-center gap-2 my-3 text-[11px] text-slate-500">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="flex items-center gap-1 font-medium text-slate-400">
            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" /> Branch Replies ({activeThreadMessages.length})
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Nested Thread Messages */}
        {activeThreadMessages.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs space-y-2">
            <GitFork className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
            <p className="font-medium text-slate-400">No replies in this branch yet.</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Submitting a message below will create a new branch child node attached to this anchor without altering other conversations.
            </p>
          </div>
        ) : (
          activeThreadMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2.5">
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
      <div className="p-3.5 border-t border-slate-800 bg-slate-900/90">
        <div className="relative flex items-center">
          <input
            type="text"
            value={threadInputValue}
            onChange={(e) => setThreadInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in branch thread (forks history)..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
          />
          <button
            onClick={handleSend}
            disabled={!threadInputValue.trim() || isLoading}
            className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition"
            title="Send branch reply"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-indigo-400" /> Context: {activeThreadPath.length + 1} ancestor nodes
          </span>
          <span>Press Enter to send</span>
        </div>
      </div>

    </div>
  );
};
