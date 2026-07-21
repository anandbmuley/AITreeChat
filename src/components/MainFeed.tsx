import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  ChevronRight, 
  GitFork, 
  Terminal, 
  Bot, 
  User, 
  RefreshCw,
  Sparkles,
  Layers,
  ArrowDown
} from 'lucide-react';
import { ChatNode } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MainFeedProps {
  rootIds: string[];
  nodes: Record<string, ChatNode>;
  activeThreadId: string | null;
  isLoading: boolean;
  searchQuery: string;
  onSendMain: (content: string) => Promise<void>;
  onOpenThread: (nodeId: string) => void;
  onInspectPath: (nodeId: string) => void;
  getReplyCount: (nodeId: string) => number;
}

export const MainFeed: React.FC<MainFeedProps> = ({
  rootIds,
  nodes,
  activeThreadId,
  isLoading,
  searchQuery,
  onSendMain,
  onOpenThread,
  onInspectPath,
  getReplyCount,
}) => {
  const [inputValue, setInputValue] = useState('');
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when root messages update
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = mainScrollRef.current.scrollHeight;
    }
  }, [rootIds, nodes]);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMain(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const promptSuggestions = [
    "Design an Event-Driven notification system for order updates.",
    "Compare Monolithic vs Microservices database migration strategies.",
    "What are best practices for high-throughput Rate Limiting?"
  ];

  // Filter root ids if search query exists
  const filteredRootIds = rootIds.filter(rootId => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const rootNode = nodes[rootId];
    if (!rootNode) return false;
    if (rootNode.content.toLowerCase().includes(query)) return true;
    return rootNode.childrenIds.some(childId => {
      const child = nodes[childId];
      return child && child.content.toLowerCase().includes(query);
    });
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-900 min-w-0 h-full relative">
      
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-950/80 border border-indigo-800/60 rounded-lg text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              Main Channel Stream
            </h2>
            <p className="text-[11px] text-slate-400">Level-0 Core Timeline</p>
          </div>
        </div>

        {activeThreadId && (
          <div className="text-xs text-indigo-300 flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-800/60 px-3 py-1 rounded-full animate-pulse">
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            <span>Thread Side Panel Active</span>
          </div>
        )}
      </div>

      {/* Main Timeline Chat Stream */}
      <div ref={mainScrollRef} className="flex-1 overflow-y-auto p-6 space-y-8">
        {filteredRootIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
            <Layers className="w-12 h-12 mb-3 text-indigo-400/40" />
            <p className="text-sm font-medium text-slate-300">No matching root conversations found</p>
            <p className="text-xs text-slate-500 mt-1">Start a top-level prompt below to initialize a new conversation tree.</p>
          </div>
        ) : (
          filteredRootIds.map((rootId) => {
            const userNode = nodes[rootId];
            if (!userNode) return null;

            const childResponses = userNode.childrenIds.map(id => nodes[id]).filter(Boolean);

            return (
              <div key={userNode.id} className="space-y-4 max-w-4xl mx-auto animate-fade-in">
                
                {/* User Prompt Root Card */}
                <div className="flex items-start gap-3.5 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>

                  <div className="flex-1 bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 shadow-sm hover:border-slate-600 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                        User Prompt
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{userNode.timestamp}</span>
                    </div>

                    <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">
                      {userNode.content}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center justify-between text-xs">
                      <button
                        onClick={() => onInspectPath(userNode.id)}
                        className="text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 text-[11px] transition"
                        title="View path payload dispatched to Gemini API"
                      >
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Inspect Path Payload</span>
                      </button>

                      <span className="text-[10px] text-slate-400 font-mono">ID: {userNode.id}</span>
                    </div>
                  </div>
                </div>

                {/* Assistant Primary Response Cards */}
                {childResponses.map((aiNode) => {
                  const replyCount = getReplyCount(aiNode.id);
                  const isCurrentThread = activeThreadId === aiNode.id;

                  return (
                    <div key={aiNode.id} className="flex items-start gap-3.5 ml-6 md:ml-8 border-l-2 border-slate-800 pl-4 py-1">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex-shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>

                      <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700/80 transition">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-400">
                              AI Assistant
                            </span>
                            {aiNode.metadata?.model && (
                              <span className="text-[10px] bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                                {aiNode.metadata.model.replace('gemini-', '')}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{aiNode.timestamp}</span>
                        </div>

                        <MarkdownRenderer content={aiNode.content} />

                        {/* Thread Trigger & Branch Action Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                          <button
                            onClick={() => onOpenThread(aiNode.id)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
                              isCurrentThread
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80'
                            }`}
                          >
                            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                            <span>
                              {replyCount > 0 ? `${replyCount} Thread ${replyCount === 1 ? 'Reply' : 'Replies'}` : 'Reply in Thread'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            onClick={() => onInspectPath(aiNode.id)}
                            className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1.5 transition px-2 py-1 rounded hover:bg-slate-900"
                          >
                            <Terminal className="w-3.5 h-3.5 text-slate-400" />
                            <span>Path Trace</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            );
          })
        )}

        {isLoading && !activeThreadId && (
          <div className="flex items-center justify-center gap-3 text-slate-400 text-xs py-4 animate-pulse max-w-4xl mx-auto">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Traversing tree graph & generating response...</span>
          </div>
        )}
      </div>

      {/* Main Input Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 backdrop-blur">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {/* Quick Prompt Suggestions */}
          {rootIds.length <= 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-amber-400" /> Try prompt:
              </span>
              {promptSuggestions.map((suggestion, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => setInputValue(suggestion)}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition"
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
              placeholder="Start a new top-level conversation stream... (Press Enter to submit)"
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-2xl py-3 pl-4 pr-14 text-sm text-slate-100 placeholder-slate-500 outline-none resize-none transition shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-3 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition shadow-md shadow-indigo-600/30"
              title="Send top-level message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Creates Level-0 Root Node in graph</span>
            <span>Shift + Enter for new line</span>
          </div>

        </div>
      </div>

    </div>
  );
};
