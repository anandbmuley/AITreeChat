import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to split text by code blocks ```...```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0].trim();
          const language = firstLine.match(/^[a-zA-Z0-9_-]+$/) ? firstLine : '';
          const codeText = language ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={idx} className="my-3 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800/80 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-400">
                  <Code2 className="w-3.5 h-3.5" />
                  {language || 'code'}
                </span>
                <button
                  onClick={() => handleCopyCode(codeText, idx)}
                  className="flex items-center gap-1 hover:text-slate-200 transition text-[11px] py-0.5 px-2 rounded hover:bg-slate-800"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-200 leading-normal">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }

        // Render standard paragraph text with inline formatting
        return (
          <div key={idx} className="space-y-1.5">
            {part.split('\n\n').map((paragraph, pIdx) => {
              if (!paragraph.trim()) return null;

              // Headers
              if (paragraph.startsWith('### ')) {
                return <h3 key={pIdx} className="text-sm font-bold text-slate-100 mt-2 mb-1">{paragraph.replace('### ', '')}</h3>;
              }
              if (paragraph.startsWith('## ')) {
                return <h2 key={pIdx} className="text-base font-bold text-slate-100 mt-2.5 mb-1">{paragraph.replace('## ', '')}</h2>;
              }
              if (paragraph.startsWith('# ')) {
                return <h1 key={pIdx} className="text-lg font-bold text-indigo-300 mt-3 mb-1.5">{paragraph.replace('# ', '')}</h1>;
              }

              // Lists
              if (paragraph.includes('\n* ') || paragraph.includes('\n1. ') || paragraph.startsWith('* ') || paragraph.startsWith('1. ')) {
                const lines = paragraph.split('\n');
                return (
                  <ul key={pIdx} className="list-disc list-inside space-y-1 my-1 pl-1">
                    {lines.map((line, lIdx) => {
                      const cleanLine = line.replace(/^(\*|\d+\.)\s*/, '');
                      return (
                        <li key={lIdx} className="text-slate-300">
                          {renderInlineFormatted(cleanLine)}
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              return (
                <p key={pIdx} className="text-slate-300 whitespace-pre-wrap">
                  {renderInlineFormatted(paragraph)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

function renderInlineFormatted(text: string) {
  // Handle bold **text** and inline `code`
  const parts = text.split(/(\*\*[\s\S]*?\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-indigo-200">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
