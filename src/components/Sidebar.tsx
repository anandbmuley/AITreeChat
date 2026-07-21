import React, { useState } from 'react';
import { 
  GitFork, 
  MessageSquare, 
  Layers, 
  CheckCircle2, 
  Sparkles, 
  Key, 
  Download, 
  Upload, 
  RotateCcw, 
  Network, 
  Cpu, 
  Merge,
  Search
} from 'lucide-react';
import { ViewMode } from '../types/chat';
import { AVAILABLE_MODELS } from '../services/geminiApi';

interface SidebarProps {
  activeViewMode: ViewMode;
  setActiveViewMode: (mode: ViewMode) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  nodeCount: number;
  rootCount: number;
  activeThreadDepth: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenSynthesis: () => void;
  onExportGraph: () => void;
  onImportGraph: (jsonString: string) => boolean;
  onResetGraph: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeViewMode,
  setActiveViewMode,
  selectedModel,
  setSelectedModel,
  apiKey,
  setApiKey,
  nodeCount,
  rootCount,
  activeThreadDepth,
  searchQuery,
  setSearchQuery,
  onOpenSynthesis,
  onExportGraph,
  onImportGraph,
  onResetGraph,
}) => {
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [importError, setImportError] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const success = onImportGraph(text);
        if (!success) setImportError(true);
        else setImportError(false);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col justify-between p-4 hidden md:flex select-none">
      <div className="space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/25">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wider text-slate-100 uppercase">AI Tree Chat</h1>
            <p className="text-[11px] text-slate-400 font-medium">Branching Dialogue System</p>
          </div>
        </div>

        {/* View Mode Navigation Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setActiveViewMode('feed')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition ${
              activeViewMode === 'feed'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Feed View</span>
          </button>
          <button
            onClick={() => setActiveViewMode('visualizer')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium transition ${
              activeViewMode === 'visualizer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Graph Map</span>
          </button>
        </div>

        {/* Search Node Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tree nodes..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 outline-none transition"
          />
        </div>

        {/* Action Button: Synthesis */}
        <button
          onClick={onOpenSynthesis}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-900/40 to-slate-900 hover:from-indigo-800/50 border border-indigo-700/50 text-indigo-200 hover:text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Merge className="w-4 h-4 text-indigo-400" />
          <span>Synthesize 2 Branches</span>
        </button>

        {/* Model Selector & API Key */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Model Engine
            </span>
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`p-1 rounded transition text-xs ${apiKey ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
              title={apiKey ? "API Key Set" : "Configure Custom API Key"}
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.badge})
              </option>
            ))}
          </select>

          {showApiKeyInput && (
            <div className="pt-1 space-y-1">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste Gemini API Key..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 outline-none transition"
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                Leave empty for built-in simulation mode.
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Tree Graph Metrics */}
        <div className="space-y-2.5">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <Layers className="w-4 h-4" /> Graph Nodes
              </span>
              <span className="font-mono text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                {nodeCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Root Streams (L-0):</span>
              <span className="font-mono text-slate-200">{rootCount}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Active Thread Depth:</span>
              <span className="font-mono text-emerald-400">{activeThreadDepth} nodes</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Context Isolation</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Threads strictly extract Ancestor Path to Root, guaranteeing zero cross-branch context leakage.
            </p>
          </div>
        </div>

      </div>

      {/* Footer Controls: Export, Import, Reset */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px]">
        {importError && (
          <p className="text-rose-400 text-[10px] mb-1">Failed to import JSON graph file.</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onExportGraph}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition"
            title="Export conversation graph to JSON file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <button
          onClick={onResetGraph}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-slate-500 hover:text-rose-400 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Sample Tree</span>
        </button>

        <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> AI Tree Engine
          </span>
          <span>v1.0.0</span>
        </div>
      </div>

    </div>
  );
};
