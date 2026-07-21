# AITreeChat: Multi-Branching LLM Chat Engine

> **A Directed Acyclic Graph (DAG) dialogue system designed for multi-branching LLM conversations without context poisoning.**

---

## 🖼️ User Interface Preview

### Main Feed & Thread Drawer
![Main Feed View](images/AI%20Tree%20Chat%20Feed%20View.png)

### Interactive Tree Graph Visualizer
![Interactive Tree Graph View](images/AI%20Tree%20Chat%20Graph%20View.png)

---

## 📌 Executive Summary & Motivation

Traditional Large Language Model (LLM) chat interfaces (such as ChatGPT or Claude) treat user interactions as a **strict linear sequence of messages**. While linear feeds work well for simple Q&A, they fail significantly when users engage in complex problem-solving, architectural design, debugging, or creative brainstorming.

**AITreeChat** reimagines LLM conversations by modeling them as a **Directed Acyclic Graph (DAG)** or **Tree Structure**, while preserving a clean, intuitive **Threaded Side-Drawer UX**.

```
                           [Root User Prompt]
                                   │
                         [AI Primary Response]
                         /         │         \
             ┌──────────┘          │          └──────────┐
             ▼                     ▼                     ▼
     [Thread Branch A]     [Thread Branch B]     [Main Feed Continues]
    (Event-Driven Arch)     (API Gateway)         (Database Sharding)
             │                     │                     │
      (Isolated Context)    (Isolated Context)    (Isolated Context)
```

---

## 🎯 Why We Need a Branching Chat UI

### 1. The "Context Poisoning" Problem
In a linear chat interface, if you ask an LLM about **3 microservice patterns** (e.g., Event-Driven, API Gateway, Database-per-Service) and spend 10 messages diving deep into Event-Driven architecture, your 11th message about API Gateways will still carry the entire history of Event-Driven discussion in its context window.
* **Result**: The LLM becomes biased, distracted, or confused by irrelevant historical tokens, leading to lower quality responses and unnecessary token expenditure.

### 2. Cognitive Overload & Chaotic Feeds
Mixing high-level architectural decisions with deep-dive technical rabbit holes in a single chat stream creates visual clutter and makes navigating long discussions nearly impossible.

### 3. Destructive Editing vs. Non-Destructive Exploration
In conventional UIs, editing an earlier message or re-generating a response truncates or overwrites all subsequent messages down that path. Users lose valuable insights and previous iterations.

---

## ⚡ Comparative Overview

| Feature | Linear Chat UIs (Standard) | AITreeChat (Thread-Graph) |
| :--- | :--- | :--- |
| **Data Model** | Linear Array (`Message[]`) | Directed Acyclic Graph (`Record<string, ChatNode>`) |
| **Context Strategy** | Full window / sliding history | **Path Traversal (`Root → ... → Node`)** |
| **Tangential Explorations** | Pollutes main conversation | **Isolated in side-drawer threads** |
| **Context Poisoning** | High risk across topics | **Zero contamination between branches** |
| **History Preservation** | Destructive (edits overwrite history) | **Non-Destructive (forks anytime)** |
| **UX Ergonomics** | Single scrolling column | **Dual-pane (Main timeline + Thread drawer)** |

---

## 🛠️ Key Architectural & Functional Concepts

### 1. Path Traversal Engine (`getPathToRoot`)
Instead of sending the entire chat graph or current screen state to the LLM, AITreeChat runs a deterministic traversal algorithm to construct the exact ancestral lineage of the target node:

$$\text{Path Context} = [N_0, N_1, N_2, \dots, N_k]$$

```typescript
function getPathToRoot(
  nodes: Record<string, ChatNode>, 
  targetNodeId: string
): ChatNode[] {
  const path: ChatNode[] = [];
  let currentId: string | null = targetNodeId;

  while (currentId && nodes[currentId]) {
    const currentNode = nodes[currentId];
    path.unshift(currentNode); // Prepend to preserve chronological sequence
    currentId = currentNode.parentId;
  }

  return path;
}
```
* **Time Complexity**: $\mathcal{O}(d)$, where $d$ is the branch depth (typically $d \le 20$).
* **Space Complexity**: $\mathcal{O}(d)$ token payload array.
* **Benefit**: Branch B never sees messages from Branch A. Context remains 100% clean and focused.

---

### 2. Normalized State Architecture
To avoid the performance degradation and complex immutability handling of deeply nested tree structures, the conversation graph is stored as a flat/normalized dictionary:

```typescript
type MessageRole = 'user' | 'assistant' | 'system';

interface ChatNode {
  id: string;
  parentId: string | null; // Pointer to immediate ancestor
  childrenIds: string[];   // Array of immediate child node IDs
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokens?: number;
    forkTitle?: string;
  };
}

interface ConversationGraph {
  rootIds: string[];                  // Level-0 message IDs in main stream
  nodes: Record<string, ChatNode>;     // Normalized lookup table (O(1) lookups)
  activeThreadNodeId: string | null;  // Active node open in thread drawer
}
```

---

### 3. Threaded Dual-Pane UX & Features

* **Main Channel Feed (Level-0 Stream)**: Displays high-level prompts and root-level assistant responses. Keeps the primary narrative clean and linear.
* **Right Thread Drawer (Active Sub-Branch)**: Opens when clicking "Reply in Thread" on any AI response card. Displays the complete ancestor hierarchy along with isolated sub-tree conversations and side explorations without cluttering the main feed.
* **Parallel Fork Tab Management**: When multiple thread branches are spawned off the same AI message, they are organized into distinct selectable cards and tabs inside the Thread Drawer.
* **AI-Restricted Thread Forking**: Branching and thread creation are strictly tied to AI assistant responses, maintaining structured prompt-response mechanics.
* **Interactive Tree Graph Visualizer**: A visual DAG graph view (`TreeGraphVisualizer`) displaying conversation topology, branch depths, and node lineage. Clicking any node instantly opens its branch in the Thread Drawer.
* **Branch Convergence & Synthesis Modal**: Built-in branch comparison engine (`BranchSynthesisModal`) allowing users to pick two leaf nodes from separate sub-trees and synthesize their collective context into a unified report.
* **Path Context Inspector Modal**: A visual debugging utility that allows users to inspect the exact context payload assembled by `getPathToRoot` before dispatching to the LLM API.
* **Session Management & Graph I/O**: Supports creating new sessions ("New Chat"), exporting conversation DAGs as JSON files, and importing saved graphs.

---

### 4. API Resiliency & Exponential Backoff
Requests to external LLM providers (e.g., Google Gemini API) incorporate exponential backoff with retries to handle rate limits, transient network errors, or API throttling gracefully:

```typescript
// Exponential backoff strategy: 1s -> 2s -> 4s -> 8s -> 16s
let delay = 1000;
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    const response = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    if (response.ok) return await response.json();
  } catch (err) {
    if (attempt === maxRetries - 1) throw err;
  }
  await new Promise(resolve => setTimeout(resolve, delay));
  delay *= 2;
}
```

---

## 💡 Real-World Use Cases

### 1. Complex Software Architecture & Engineering
* **Scenario**: Comparing architectural strategies (e.g., Event-Driven vs. Monolith vs. Serverless).
* **Usage**: Ask for overview in main feed, then fork separate thread branches for each option. Deep dive into Kafka idempotency in Branch A without polluting Lambda scaling discussions in Branch B.

### 2. Multi-Hypothesis Technical Debugging
* **Scenario**: Diagnosing a subtle memory leak or race condition in production.
* **Usage**: Test Hypothesis 1 (garbage collection) in Thread 1 and Hypothesis 2 (unclosed database connection pool) in Thread 2. Switch back and forth seamlessly.

### 3. Creative Writing & Narrative Design
* **Scenario**: Developing alternative story endings or character choices.
* **Usage**: Explore "Option A: Character surrenders" in one fork and "Option B: Character escapes" in another fork without mixing plot lines.

### 4. Decision Analysis & Tradeoff Matrix
* **Scenario**: Evaluating legal, financial, or strategic decisions.
* **Usage**: Keep high-level criteria in the main stream; test sensitive variables or edge cases in isolated sub-threads.

---

## 📂 Key Project Architecture & Source Code

* **[src/App.tsx](file:///Users/monika/Projects/AI/AITreeChat/src/App.tsx)**: Core application layout orchestrating the timeline feed, thread side-drawer, visual tree graph map, path inspector modal, and branch synthesis modal.
* **[src/hooks/useTreeChatState.ts](file:///Users/monika/Projects/AI/AITreeChat/src/hooks/useTreeChatState.ts)**: Normalized graph state manager (`getPathToRoot`, `getBranchesForNode`, `sendMainMessage`, `sendThreadMessage`).

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18+ recommended)
* **npm** or **pnpm**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/anandbmuley/AITreeChat.git
   cd AITreeChat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

---

## 🔮 Future Roadmap & Enhancements

1. **Branch Pruning & Archiving**: Ability to archive, collapse, or soft-delete low-yield branches to optimize visual space during deep research sessions.
2. **Multi-Model Parallel Evaluation**: Pass the same thread context to multiple LLM providers (e.g., Gemini vs Claude vs OpenAI) simultaneously in parallel sub-threads to compare model performance.
3. **Local Storage & Cloud Sync Persistence**: Automatic IndexedDB/SQLite local persistence and cloud sync for cross-device session continuation.
