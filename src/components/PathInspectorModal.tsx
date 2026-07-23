import React, { useState } from 'react';
import { Terminal, X, Copy, Check, ArrowRight, Database, ShieldCheck } from 'lucide-react';
import { ChatNode } from '../types/chat';

interface PathInspectorModalProps {
  inspectedNodeId: string;
  getPathToRoot: (nodeId: string) => ChatNode[];
  onClose: () => void;
}

export const PathInspectorModal: React.FC<PathInspectorModalProps> = ({
  inspectedNodeId,
  getPathToRoot,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const path = getPathToRoot(inspectedNodeId);

  const formattedPayload = path.map(node => ({
    role: node.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: node.content }],
    _nodeMeta: { id: node.id, parentId: node.parentId, timestamp: node.timestamp }
  }));

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(formattedPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalChars = path.reduce((acc, n) => acc + n.content.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-colors duration-200">
        
        {/* Terminal Header Bar */}
        <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-800 mx-1" />
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-semibold">
              <Terminal className="w-4 h-4" />
              <span>getPathToRoot('{inspectedNodeId}') — Traversal Inspector</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg transition"
              title="Copy JSON Payload"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copied ? 'Copied Payload' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info & Metrics Panel */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">Context Isolation Active</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>Path Nodes: <strong className="text-indigo-600 dark:text-indigo-400">{path.length}</strong></span>
              <span>Total Chars: <strong className="text-indigo-600 dark:text-indigo-400">{totalChars}</strong></span>
              <span>Est. Tokens: <strong className="text-emerald-600 dark:text-emerald-400">~{estimatedTokens}</strong></span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            This window shows the isolated chain of parent nodes collected by recursively walking <code className="bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 px-1 py-0.5 rounded">node.parentId</code>. Unrelated branches are completely omitted to prevent token bloat and context poisoning.
          </p>
        </div>

        {/* Path Traversal Steps List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50 dark:bg-transparent">
          {path.map((node, index) => (
            <div key={node.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 space-y-2 font-mono text-xs shadow-sm">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded text-[10px] font-bold">
                    Step {index + 1}
                  </span>
                  <span className={`font-semibold ${node.role === 'user' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    [{node.role.toUpperCase()}]
                  </span>
                  <span className="text-slate-400 text-[11px]">ID: {node.id}</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Parent: <strong className="text-slate-700 dark:text-slate-300">{node.parentId || 'NULL (ROOT)'}</strong></span>
                  {index < path.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/90 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {node.content}
              </div>

            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex justify-between items-center text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Target Node: {inspectedNodeId}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
