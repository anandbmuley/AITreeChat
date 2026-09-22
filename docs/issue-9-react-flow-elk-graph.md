# Issue #9 — React Flow + ELK graph view

Tracking issue: [#9 "Improving the visual representation of the Tree Chat"](https://github.com/anandbmuley/AITreeChat/issues/9)

## Context

Issue #9 asks for the graph representation to be rendered with React Flow laid out
by ElkJS (https://reactflow.dev/examples/layout/elkjs).

Today `src/components/TreeGraphVisualizer.tsx` fakes a tree with recursive nested
`<div>`s, left padding per level and a CSS `::before` rail (`.tree-connector-line`
in `src/index.css`). Consequences: no real edges, siblings drift further right with
every level, deep graphs need horizontal *and* vertical scrolling, and there is no
pan/zoom/fit-view — so the DAG shape (the whole point of the app) is hard to read.

Outcome: the Graph Map view becomes a real pan/zoom canvas with ELK-computed
layered layout and drawn edges, so branch structure is visible at a glance.

**Decisions taken:**
- Scope is the graph view only. Feed, Sidebar, ThreadDrawer and the modals are untouched.
- Clicking a node keeps today's behavior: it opens the existing `ThreadDrawer` via `openThread`.
- Nodes keep full detail (role, model badge, timestamp, content excerpt, actions, child count).

Branch: `feature/9-react-flow-elk-graph`. PR into `development`.

## Dependencies

Add to `package.json` (`npm install`):
- `@xyflow/react` `^12.11.6` — React Flow v12 (package renamed from `reactflow`; peer deps satisfied by React 18).
- `elkjs` `^0.12.0` — imported as `elkjs/lib/elk.bundled.js`, which bundles its own worker-free build and works under Vite. Ships its own types.

Import `@xyflow/react/dist/style.css` once, in `src/main.tsx`, before `./index.css`
so Tailwind utilities win over React Flow defaults.

## Implementation

### 1. `src/hooks/useElkLayout.ts` (new)

Owns the graph→layout transformation. Keeps `TreeGraphVisualizer` presentational.

- Export `NODE_WIDTH = 320`, `NODE_HEIGHT = 168`. Fixed card size makes the ELK pass
  deterministic and avoids a measure-then-relayout round trip; the node card clamps
  content to fit (see §2).
- Build React Flow inputs from the existing normalized state — walk `rootIds` +
  `nodes[].childrenIds` (no new traversal helper needed; `useTreeChatState` already
  exposes everything else the card needs):
  - node: `{ id, type: 'chatNode', position: {x:0,y:0}, width, height, data: { node, depth } }`
  - edge: one per `parentId → childId`, `{ id: `e-${parent}-${child}`, source, target, type: 'smoothstep', animated: isMain }`
  - Mark main-line edges (`nodes[childId].metadata?.isMain`) so they can be drawn thicker/indigo.
- Run ELK in an effect, guarded by a ref so a stale async result never overwrites a
  newer one:

```ts
const elk = new ELK();
const layoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',              // LR reads better with 320px-wide cards
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '40',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
};
```

  Multiple roots are fine — ELK lays out a forest in one graph. Feed ELK children as
  `{ id, width, height }` and edges as `{ id, sources:[s], targets:[t] }`, then map the
  returned `x/y` back onto React Flow `position`.
- Return `{ nodes, edges, isLayouting }`. Re-run only when the graph shape changes —
  memoize on a cheap signature (`Object.keys(nodes).length` plus a joined
  `id:childrenIds.length` string) so selecting a node or hovering does not re-layout.

### 2. `src/components/graph/ChatFlowNode.tsx` (new)

A `memo`'d custom React Flow node, `NodeProps` typed against the data shape above.
Lift the existing card markup out of `TreeGraphVisualizer.tsx` almost verbatim —
role avatar, `Depth {level}`, the model-badge IIFE, timestamp, `line-clamp-3`
content, the "View Hierarchy / N Replies" and "Path Trace" buttons, child count —
so the visual language and dark-mode classes stay consistent with `MainFeed`.

- Wrap in a fixed-size box (`w-[320px] h-[168px] overflow-hidden`) matching the ELK constants.
- `<Handle type="target" position={Position.Left} />` and `<Handle type="source" position={Position.Right} />`, visually minimal.
- Callbacks (`onOpenThread`, `onInspectPath`, `getReplyCount`) reach the node through
  the React Flow `nodes[].data` object; keep them in a stable `useCallback`/context so
  `memo` stays effective.
- Buttons call `e.stopPropagation()` (already the pattern in the current file) so the
  canvas does not treat them as node drags.

### 3. `src/components/TreeGraphVisualizer.tsx` (rewrite, same props)

Same props as today, plus `isDark: boolean` and `searchQuery: string`. Renders:

- The existing 14px top bar and legend — keep it, it matches `MainFeed`'s header.
- `<ReactFlowProvider>` wrapping `<ReactFlow>` with:
  `nodeTypes={{ chatNode: ChatFlowNode }}` (module-level constant, not inline),
  `colorMode={isDark ? 'dark' : 'light'}`, `fitView`, `fitViewOptions={{ padding: 0.2 }}`,
  `nodesDraggable={false}` (ELK owns position), `minZoom={0.2}`.
- `<Background variant="dots" />`, `<Controls />`, `<MiniMap />` (minimap colored by
  role — this is the piece that makes big graphs navigable).
- Keep the empty state and the hover-highlights-ancestor-path behavior: on node hover,
  compute `getPathToRoot(id)` and add a highlight flag to those nodes plus their
  connecting edges. The selected-thread ring (`activeThreadId`) carries over unchanged.
- `searchQuery` (already plumbed into `Sidebar` and `MainFeed` but currently ignored
  by the visualizer): dim nodes whose `content` does not match, so search works in the
  graph too. Small, and it is the main "easy to visualize" win beyond layout.

### 4. `src/App.tsx`

`useTheme()` already returns `isDark`; destructure it and pass `isDark` and
`searchQuery` into `<TreeGraphVisualizer>`. No other change.

### 5. Cleanup

Delete the `.tree-connector-line` rules from `src/index.css` — after the rewrite it
has no remaining consumer (verified: only `TreeGraphVisualizer.tsx` used it).

## Verification

1. `npm install` then `npm run build` — `tsc --strict` must pass; watch for React Flow
   v12 generic-node typing on `NodeProps` and for the `elkjs/lib/elk.bundled.js` import
   resolving under `moduleResolution: bundler` (add a `declare module` shim in
   `src/vite-env.d.ts` only if TS cannot find the bundled entry's types).
2. `npm run dev`, switch to **Graph Map** in the sidebar. Expect: the seeded 5-node
   sample tree laid out left-to-right, `node-2` visibly forking to `node-3` and `node-5`,
   real edges, fit-to-view on load.
3. Click a node → `ThreadDrawer` opens on that node. "Path Trace" → `PathInspectorModal`
   shows the same ancestor path as before. Hover a deep node → its root path highlights.
4. Send a few main messages and a thread reply in Feed view, return to Graph Map:
   new nodes appear with the layout re-run, no jump/flicker, no console errors.
5. Toggle Light/Dark/System in the sidebar — canvas, edges, minimap and cards all
   follow (`colorMode` + existing `dark:` classes).
6. Type in the sidebar search box while on Graph Map — non-matching nodes dim.
7. Import a larger exported graph (sidebar Import) to sanity-check layout and pan/zoom
   at ~50+ nodes.
