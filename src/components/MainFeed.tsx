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
  ArrowDown,
  Cpu,
  Zap,
  Brain,
  Info,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { ChatNode, TreeComplexityMetrics } from '../types/chat';
import { AVAILABLE_MODELS } from '../services/geminiApi';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThemeMode } from '../hooks/useTheme';

interface MainFeedProps {
  rootIds: string[];
  nodes: Record<string, ChatNode>;
  activeThreadId: string | null;
  isLoading: boolean;
  searchQuery: string;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  getMainLineNodes: () => ChatNode[];
  getComplexityForPath: (nodeId: string | null) => TreeComplexityMetrics;
  onSendMain: (content: string, modelOverride?: string) => Promise<void>;
  onOpenThread: (nodeId: string) => void;
  onInspectPath: (nodeId: string) => void;
  getReplyCount: (nodeId: string) => number;
  themeMode?: ThemeMode;
  setThemeMode?: (mode: ThemeMode) => void;
}

export const MainFeed: React.FC<MainFeedProps> = ({
  rootIds,
  nodes,
  activeThreadId,
  isLoading,
  searchQuery,
  selectedModel,
  setSelectedModel,
  getMainLineNodes,
  getComplexityForPath,
  onSendMain,
  onOpenThread,
  onInspectPath,
  getReplyCount,
  themeMode,
  setThemeMode,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [nodeModelOverride, setNodeModelOverride] = useState<string>(selectedModel);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Sync nodeModelOverride if global selectedModel changes
  useEffect(() => {
    setNodeModelOverride(selectedModel);
  }, [selectedModel]);

  const mainLineNodes = getMainLineNodes();
  const lastNode = mainLineNodes.length > 0 ? mainLineNodes[mainLineNodes.length - 1] : null;
  
  // Compute path complexity for the target node
  const complexity = getComplexityForPath(lastNode ? lastNode.id : null);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = mainScrollRef.current.scrollHeight;
    }
  }, [nodes]);

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

  const promptSuggestions = [
    "Design a scalable microservice architecture for AI data trees",
    "Compare trade-offs between Graph DBs and SQL for hierarchical trees",
    "Write a TypeScript algorithm to find lowest common ancestor in DAG",
    "Explain quantum superposition with interactive tree analogy"
  ];

  // Group linear main line nodes into User/AI pairs
  const mainPairs: { userNode: ChatNode; aiNode?: ChatNode }[] = [];
  for (let i = 0; i < mainLineNodes.length; i++) {
    const node = mainLineNodes[i];
    if (node.role === 'user') {
      const nextNode = mainLineNodes[i + 1];
      const aiNode = nextNode && nextNode.role === 'assistant' ? nextNode : undefined;
      mainPairs.push({ userNode: node, aiNode });
      if (aiNode) i++;
    }
  }

  // Filter pairs if search query exists
  const filteredPairs = mainPairs.filter(({ userNode, aiNode }) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (userNode.content.toLowerCase().includes(query)) return true;
    if (aiNode && aiNode.content.toLowerCase().includes(query)) return true;
    return false;
  });

  const toggleTheme = () => {
    if (!setThemeMode) return;
    if (themeMode === 'system') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('light');
    else setThemeMode('system');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-w-0 h-full relative transition-colors duration-200">
      
      {/* Top Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/60 backdrop-blur z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 rounded-lg text-indigo-600 dark:text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-200 text-sm flex items-center gap-2">
              Main Channel Stream
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Linear History Timeline</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeThreadId && (
            <div className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1 rounded-full animate-pulse">
              <GitFork className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Thread Active</span>
            </div>
          )}

          {/* Prominent Header Theme Toggle Button */}
          {setThemeMode && (
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-semibold shadow-sm transition"
              title={`Current Theme: ${themeMode?.toUpperCase()}. Click to switch theme.`}
            >
              {themeMode === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : themeMode === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Laptop className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span className="capitalize">{themeMode || 'Theme'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline Chat Stream */}
      <div ref={mainScrollRef} className="flex-1 overflow-y-auto p-6 space-y-8">
        {filteredPairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 dark:text-slate-500">
            <Layers className="w-12 h-12 mb-3 text-indigo-400/40" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No matching conversations found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start a message below to initialize your linear conversation stream.</p>
          </div>
        ) : (
          filteredPairs.map(({ userNode, aiNode }) => {
            return (
              <div key={userNode.id} className="space-y-4 max-w-4xl mx-auto animate-fade-in">
                
                {/* User Prompt Card */}
                <div className="flex items-start gap-3.5 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>

                  <div className="flex-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
                        User Prompt
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{userNode.timestamp}</span>
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">
                      {userNode.content}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between text-xs">
                      <button
                        onClick={() => onInspectPath(userNode.id)}
                        className="text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1.5 text-[11px] transition"
                        title="View path payload dispatched to Gemini API"
                      >
                        <Terminal className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        <span>Inspect Path Payload</span>
                      </button>

                      <span className="text-[10px] text-slate-400 font-mono">ID: {userNode.id}</span>
                    </div>
                  </div>
                </div>

                {/* Assistant Primary Response Card */}
                {aiNode && (() => {
                  const replyCount = getReplyCount(aiNode.id);
                  const isCurrentThread = activeThreadId === aiNode.id;

                  return (
                    <div key={aiNode.id} className="flex items-start gap-3.5 ml-6 md:ml-8 border-l-2 border-slate-300 dark:border-slate-800 pl-4 py-1">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex-shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>

                      <div className="flex-1 bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700/80 transition">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              AI Assistant
                            </span>
                            {aiNode.metadata?.model && (() => {
                              const modelId = aiNode.metadata.model;
                              const isPro = modelId.includes('pro');
                              const is20 = modelId.includes('2.0');
                              return (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1 border ${
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
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{aiNode.timestamp}</span>
                        </div>

                        <MarkdownRenderer content={aiNode.content} />

                        {/* Thread Trigger & Branch Action Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                          <button
                            onClick={() => onOpenThread(aiNode.id)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
                              isCurrentThread
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80'
                            }`}
                          >
                            <GitFork className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>
                              {replyCount > 0 ? `${replyCount} Thread ${replyCount === 1 ? 'Reply' : 'Replies'}` : 'Reply in Thread'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            onClick={() => onInspectPath(aiNode.id)}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-[11px] flex items-center gap-1.5 transition px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900"
                          >
                            <Terminal className="w-3.5 h-3.5 text-slate-400" />
                            <span>Path Trace</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })
        )}

        {isLoading && !activeThreadId && (
          <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 text-xs py-4 animate-pulse max-w-4xl mx-auto">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500 dark:text-indigo-400" />
            <span>Traversing tree graph & generating response...</span>
          </div>
        )}
      </div>

      {/* Main Input Box */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/60 backdrop-blur">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {/* Node Model Selector & Hierarchy Complexity Recommendation Bar */}
          <div className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs">
            {/* Complexity Indicator */}
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

            {/* Model Selector dropdown */}
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

