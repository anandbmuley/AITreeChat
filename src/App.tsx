import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTreeChatState } from './hooks/useTreeChatState';
import { Sidebar } from './components/Sidebar';
import { MainFeed } from './components/MainFeed';
import { ThreadDrawer } from './components/ThreadDrawer';
import { PathInspectorModal } from './components/PathInspectorModal';
import { TreeGraphVisualizer } from './components/TreeGraphVisualizer';
import { BranchSynthesisModal } from './components/BranchSynthesisModal';

export default function App() {
  const {
    nodes,
    rootIds,
    activeThreadNodeId,
    activeViewMode,
    selectedModel,
    apiKey,
    isLoading,
    apiError,
    setApiError,
    inspectedNodeId,
    searchQuery,
    getPathToRoot,
    getMainLineNodes,
    getThreadDescendants,
    getReplyCount,
    sendMainMessage,
    sendThreadMessage,
    openThread,
    closeThread,
    inspectNodePath,
    setSelectedModel,
    setApiKey,
    setActiveViewMode,
    setSearchQuery,
    exportGraph,
    importGraph,
    resetGraph,
    startNewSession,
  } = useTreeChatState();

  const [showSynthesisModal, setShowSynthesisModal] = useState(false);

  const activeThreadPath = activeThreadNodeId ? getPathToRoot(activeThreadNodeId) : [];
  const nodeCount = Object.keys(nodes).length;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Left Navigation & Metrics Sidebar */}
      <Sidebar
        activeViewMode={activeViewMode}
        setActiveViewMode={setActiveViewMode}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        apiKey={apiKey}
        setApiKey={setApiKey}
        nodeCount={nodeCount}
        rootCount={rootIds.length}
        activeThreadDepth={activeThreadPath.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenSynthesis={() => setShowSynthesisModal(true)}
        onExportGraph={exportGraph}
        onImportGraph={importGraph}
        onResetGraph={resetGraph}
        onNewSession={startNewSession}
      />

      {/* Main Container Area: Feed Stream vs Visual DAG Map */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {apiError && (
          <div className="bg-red-950/90 border-b border-red-800 text-red-200 px-5 py-3 text-xs flex items-center justify-between z-30 shadow-lg animate-fade-in">
            <div className="flex items-center gap-3 pr-4">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-red-300">Gemini API Error Alert: </span>
                <span className="text-red-100">{apiError}</span>
              </div>
            </div>
            <button
              onClick={() => setApiError(null)}
              className="p-1 text-red-400 hover:text-red-100 hover:bg-red-900/60 rounded-lg transition"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeViewMode === 'feed' ? (
          <MainFeed
            rootIds={rootIds}
            nodes={nodes}
            activeThreadId={activeThreadNodeId}
            isLoading={isLoading}
            searchQuery={searchQuery}
            getMainLineNodes={getMainLineNodes}
            onSendMain={sendMainMessage}
            onOpenThread={openThread}
            onInspectPath={inspectNodePath}
            getReplyCount={getReplyCount}
          />
        ) : (
          <TreeGraphVisualizer
            rootIds={rootIds}
            nodes={nodes}
            activeThreadId={activeThreadNodeId}
            onOpenThread={openThread}
            onInspectPath={inspectNodePath}
            getPathToRoot={getPathToRoot}
            getReplyCount={getReplyCount}
          />
        )}
      </div>

      {/* Right Sliding Side Drawer for Active Nested Thread Branch */}
      {activeThreadNodeId && (
        <ThreadDrawer
          activeThreadId={activeThreadNodeId}
          nodes={nodes}
          isLoading={isLoading}
          getPathToRoot={getPathToRoot}
          getThreadDescendants={getThreadDescendants}
          onSendThread={sendThreadMessage}
          onCloseThread={closeThread}
          onInspectPath={inspectNodePath}
          onOpenThread={openThread}
        />
      )}

      {/* Context Path Traversal Inspector Modal */}
      {inspectedNodeId && (
        <PathInspectorModal
          inspectedNodeId={inspectedNodeId}
          getPathToRoot={getPathToRoot}
          onClose={() => inspectNodePath(null)}
        />
      )}

      {/* Branch Synthesis & Convergence Modal */}
      {showSynthesisModal && (
        <BranchSynthesisModal
          nodes={nodes}
          selectedModel={selectedModel}
          apiKey={apiKey}
          getPathToRoot={getPathToRoot}
          onClose={() => setShowSynthesisModal(false)}
        />
      )}

    </div>
  );
}
