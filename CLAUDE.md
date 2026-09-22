You are a Full Stack React developer. Your job is to build and maintain the AITreeChat application, ensuring efficient state management, seamless API integration, and a responsive simply designed user interface.

## Development guidelines

- Always create separate branches for new features or bug fixes using pattern `feature/<github-issue-number>-<feature-name>` or `bugfix/<github-issue-number>-<bug-description>`
- Create a pull request for review before merging changes into the development branch.
- Always follow ReactJS best practices and coding conventions as per the official React documentation for the version used in the project.
- Follow SOLID design principles in your React components and hooks to ensure maintainable and scalable code.

## Commands

```bash
npm install        # install dependencies
npm run dev         # start Vite dev server (http://localhost:3000, auto-opens)
npm run build        # type-check (tsc) then production build via Vite
npm run preview      # preview the production build locally
```

There is no test suite or linter configured in this repo. `npm run build` (which runs `tsc` with `strict: true`) is the only automated correctness check available — run it after making changes.

The Gemini API key can be supplied via `VITE_GEMINI_API_KEY` env var, or entered at runtime in the Sidebar UI (stored in component state, passed as `apiKey`/`customApiKey` through the call chain). Without a key, `callGeminiAPI` falls back to a canned `generateSimulationResponse` so the app is fully usable offline/without credentials.

## Architecture

AITreeChat models an LLM conversation as a DAG rather than a linear array, so that branching into side-discussions never pollutes the context sent back to the model. Everything hinges on one normalized state shape and one traversal function.

### Core data model (`src/types/chat.ts`)

- `ChatNode`: a single message (`user`/`assistant`/`system`) with `id`, `parentId`, `childrenIds[]`, and `metadata` (`model`, `isMain`, `forkTitle`, etc).
- `ConversationGraph`-shaped state: `nodes: Record<string, ChatNode>` (flat O(1) lookup table) + `rootIds: string[]` + `activeThreadNodeId`.
- A node's `metadata.isMain` flag marks it as part of the main-feed linear chain; nodes without it are thread/branch replies. This flag is how the same tree is walked two different ways (main line vs. thread sub-trees) — see below.

### State + traversal (`src/hooks/useTreeChatState.ts`)

This hook owns all conversation state and is the only place that mutates the `nodes`/`rootIds` graph. Key traversal helpers, all derived from `nodes` via `useCallback`:

- `getPathToRoot(nodeId)` — walks `parentId` pointers up to the root, O(depth). This is the _only_ thing ever sent to the LLM as conversation history — never the whole graph. This is the mechanism that prevents context poisoning between branches.
- `getMainLineNodes()` — follows `childrenIds` filtered to `metadata.isMain` to reconstruct the linear main-feed chain.
- `getThreadDescendants(parentId)` / `getBranchesForNode(parentId)` — recursively collect non-main children into thread sub-trees for the Thread Drawer.
- `getComplexityForPath(nodeId)` — computes `TreeComplexityMetrics` (see below) for either a specific node's ancestor path or the main line.

`sendMainMessage` and `sendThreadMessage` are the two write paths: both build a `ChatNode`, splice it into `nodes` (updating the parent's `childrenIds`), assemble the ancestor path via `getPathToRoot`, and call `callGeminiAPI` with just that path. Main-line nodes get `metadata.isMain: true`; thread nodes don't.

### Model routing & complexity scoring (`src/services/geminiApi.ts`)

`calculatePathComplexity(historyPath, branchCount)` computes `C = depth*1.5 + (totalPathTokens/200) + branchCount*2.0` (tokens estimated as `chars/4`) and maps the score to a tier/recommended model:

- `C < 8` → low → `gemini-2.0-flash`
- `8 <= C <= 18` → medium → `gemini-2.5-flash`
- `C > 18` → high → `gemini-1.5-pro`

`AVAILABLE_MODELS` is the source of truth for selectable models (id, tier, description). Model selection is per-node/per-request (`selectedModel` state + optional `modelOverride` param on send functions), not global to the session.

`callGeminiAPI` talks to the Gemini REST API directly from the client with exponential backoff (3 attempts, 1s→2s→4s), retrying only on non-4xx or 429 errors and bailing immediately on API-key/model-not-found/unsupported errors. When no API key is configured it falls back to `generateSimulationResponse`, a keyword-matched canned-response generator — useful for UI development without hitting real credentials.

### Component structure (`src/App.tsx` + `src/components/`)

`App.tsx` wires `useTreeChatState()` + `useTheme()` into the layout and holds no conversation logic itself:

- `Sidebar` — navigation, model/theme/API-key selection, session import/export/reset.
- `MainFeed` — renders the main-line chain (`activeViewMode === 'feed'`).
- `TreeGraphVisualizer` — alternate DAG visualization of the full graph (`activeViewMode === 'visualizer'`); clicking a node opens it in the Thread Drawer.
- `ThreadDrawer` — right-side panel showing the active node's ancestor path plus its isolated thread sub-tree/branches; only rendered when `activeThreadNodeId` is set.
- `PathInspectorModal` — debug view of the exact `getPathToRoot` payload for an inspected node.
- `BranchSynthesisModal` — picks two leaf nodes and asks the model to synthesize/compare their two independent `getPathToRoot` histories via `synthesizeBranches`.

### Theming (`src/hooks/useTheme.ts`)

Three-way theme mode (`system`/`dark`/`light`) persisted to `localStorage`, applied by toggling the `dark` class on `document.documentElement` (Tailwind `dark:` variants throughout). System mode tracks `prefers-color-scheme` via a `matchMedia` listener.
