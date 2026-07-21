import React, { useState } from 'react';
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
    inspectedNodeId,
    searchQuery,
    getPathToRoot,
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
        {activeViewMode === 'feed' ? (
          <MainFeed
            rootIds={rootIds}
            nodes={nodes}
            activeThreadId={activeThreadNodeId}
            isLoading={isLoading}
            searchQuery={searchQuery}
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
