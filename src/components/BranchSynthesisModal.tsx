import React, { useState } from 'react';
import { Merge, X, RefreshCw, GitFork, Check, Sparkles, Layers } from 'lucide-react';
import { ChatNode } from '../types/chat';
import { synthesizeBranches } from '../services/geminiApi';
import { MarkdownRenderer } from './MarkdownRenderer';

interface BranchSynthesisModalProps {
  nodes: Record<string, ChatNode>;
  selectedModel: string;
  apiKey: string;
  getPathToRoot: (nodeId: string) => ChatNode[];
  onClose: () => void;
}

export const BranchSynthesisModal: React.FC<BranchSynthesisModalProps> = ({
  nodes,
  selectedModel,
  apiKey,
  getPathToRoot,
  onClose,
}) => {
  const allNodes = Object.values(nodes);
  const leafNodes = allNodes.filter(n => n.childrenIds.length === 0);

  const [selectedNodeA, setSelectedNodeA] = useState<string>(leafNodes[0]?.id || allNodes[0]?.id || '');
  const [selectedNodeB, setSelectedNodeB] = useState<string>(leafNodes[1]?.id || allNodes[allNodes.length - 1]?.id || '');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);

  const pathA = selectedNodeA ? getPathToRoot(selectedNodeA) : [];
  const pathB = selectedNodeB ? getPathToRoot(selectedNodeB) : [];

  const handleRunSynthesis = async () => {
    if (!selectedNodeA || !selectedNodeB) return;
    setIsSynthesizing(true);
    setSynthesisResult(null);

    try {
      const result = await synthesizeBranches(pathA, pathB, selectedModel, apiKey);
      setSynthesisResult(result);
    } catch (err: any) {
      console.error("Synthesis failed", err);
      const errMsg = err?.message || "Failed to synthesize branches. Please try again.";
      setSynthesisResult(`**Gemini API Error:** ${errMsg}`);
      alert(`Gemini API Error:\n\n${errMsg}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shadow-md">
              <Merge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Branch Convergence & Synthesis Engine
              </h3>
              <p className="text-[11px] text-slate-400">Synthesize 2 independent conversation paths into a unified overview</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Branch Selection Panel */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Branch A Selector */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5" /> Branch A Target Node
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Depth: {pathA.length}</span>
              </div>

              <select
                value={selectedNodeA}
                onChange={(e) => setSelectedNodeA(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
              >
                {allNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    [{node.role.toUpperCase()}] {node.id}: {node.content.slice(0, 30)}...
                  </option>
                ))}
              </select>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">Path Ancestry:</span>
                <p className="line-clamp-2 italic">{pathA.map(n => n.role === 'user' ? 'U' : 'AI').join(' ➔ ')}</p>
              </div>
            </div>

            {/* Branch B Selector */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5" /> Branch B Target Node
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Depth: {pathB.length}</span>
              </div>

              <select
                value={selectedNodeB}
                onChange={(e) => setSelectedNodeB(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
              >
                {allNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    [{node.role.toUpperCase()}] {node.id}: {node.content.slice(0, 30)}...
                  </option>
                ))}
              </select>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">Path Ancestry:</span>
                <p className="line-clamp-2 italic">{pathB.map(n => n.role === 'user' ? 'U' : 'AI').join(' ➔ ')}</p>
              </div>
            </div>

          </div>

          {/* Action Trigger Button */}
          <div className="flex justify-center">
            <button
              onClick={handleRunSynthesis}
              disabled={!selectedNodeA || !selectedNodeB || isSynthesizing}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing both branch paths...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Run Branch Synthesis ({selectedModel.replace('gemini-', '')})</span>
                </>
              )}
            </button>
          </div>

          {/* Synthesis Output Display */}
          {synthesisResult && (
            <div className="bg-slate-950 border border-indigo-900/60 rounded-2xl p-5 space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> AI Synthesis Summary
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Merged Context Payload</span>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed">
                <MarkdownRenderer content={synthesisResult} />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
