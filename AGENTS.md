# AGENTS.md

[cite_start]This file contains persistent engineering and teaching context for AI assistants working on this project[cite: 142].

---

# PROJECT OVERVIEW

[cite_start]Project name: `multiplayer-room-app`[cite: 1].
[cite_start]This is a learning-focused realtime systems project[cite: 1].
[cite_start]The long-term vision is to gradually evolve this into a simplified Discord/ChitChat-style realtime architecture[cite: 144].
[cite_start]The primary goal is NOT rapid feature development[cite: 144].
The primary goal is:
- [cite_start]deep realtime systems understanding [cite: 145]
- [cite_start]architectural thinking [cite: 145]
- [cite_start]event-driven design understanding [cite: 145]
- [cite_start]debugging intuition [cite: 145]
- [cite_start]persistent connection vs REST understanding [cite: 5, 145]

---

# IMPORTANT TEACHING STYLE

[cite_start]DO NOT immediately dump large solutions unless explicitly requested[cite: 146].

Preferred workflow:
1. [cite_start]Explain concepts deeply[cite: 146].
2. [cite_start]Explain architectural reasoning[cite: 147].
3. [cite_start]Tell the user WHAT to build[cite: 147].
4. [cite_start]Tell the user the STEPS to take[cite: 148].
5. [cite_start]Allow the user to attempt implementation first[cite: 148].
6. [cite_start]ONLY provide code when explicitly requested, user is blocked/confused, or debugging assistance is required[cite: 149].

Whenever code is provided:
- [cite_start]explain WHY the implementation exists [cite: 150]
- [cite_start]explain realtime implications [cite: 150]
- [cite_start]explain alternative approaches when useful [cite: 150]

[cite_start]Avoid tutorial-style spoonfeeding[cite: 150].

---

# ENGINEERING PHILOSOPHY

The project is intentionally being built:
- [cite_start]layer-by-layer [cite: 151]
- [cite_start]architecture-first [cite: 151]
- [cite_start]incrementally [cite: 151]
- [cite_start]experimentally [cite: 151]

---

# CURRENT TECH STACK & MONOREPO

## Frontend
- [cite_start]Next.js App Router [cite: 152]
- [cite_start]TypeScript [cite: 152]
- [cite_start]TailwindCSS [cite: 152]
- [cite_start]socket.io-client [cite: 152]

## Backend
- [cite_start]Node.js & Express [cite: 152]
- [cite_start]Socket.IO [cite: 152]
- [cite_start]TypeScript [cite: 152]

## Monorepo
- [cite_start]pnpm workspaces [cite: 152]
- [cite_start]TurboRepo has intentionally NOT been introduced yet[cite: 152].
- [cite_start]There must ONLY be ONE `pnpm-lock.yaml` and `pnpm-workspace.yaml` at the root level[cite: 153]. [cite_start]No nested workspace configs inside apps[cite: 154].

---

# CURRENT BACKEND & FRONTEND STATE

**Backend (`apps/server`):**
- [cite_start]Raw HTTP server created using Node.js `http` module[cite: 155].
- [cite_start]Socket.IO attached to HTTP server[cite: 155].
- [cite_start]Connection/disconnect lifecycle logging in modular socket architecture (`io.on("connection")`, `socket.on("disconnect")`)[cite: 155, 156].

**Frontend (`apps/web`):**
- [cite_start]Singleton socket architecture using `use client`[cite: 157].
- [cite_start]Connects to `localhost:5000`[cite: 158].

---

# CORE REALTIME CONCEPTS ESTABLISHED

1. **Socket Identity ≠ User Identity:** Each refresh/tab creates a NEW `socket.id`. [cite_start]It is connection-scoped, not user-scoped[cite: 158, 159].
2. [cite_start]**Realtime Systems Are Stateful:** Unlike REST (request -> response -> forget), sockets have a persistent lifecycle[cite: 159].
3. [cite_start]**Presence State Belongs On Server:** Online users and socket mappings live in server memory, not frontend state[cite: 160].
4. [cite_start]**Frontend State Is Local:** Manages rendering and UI, not global realtime truth[cite: 161].
5. [cite_start]**Socket Is Transport Layer:** It is a transport connection, not a permanent identity system[cite: 162].

---

# CURRENT STATE: PRESENCE MANAGEMENT (IN-PROGRESS)

We are currently building the In-Memory Presence Architecture in:
[cite_start]`apps/server/src/socket/presence.ts` [cite: 131]

**The Architectural Challenge:**
- [cite_start]Operations must be $O(1)$ time complexity to handle thousands of rapid connect/disconnects without array-filtering bottlenecks[cite: 94, 95].
- Must solve the "Multi-Tab Problem": One User Identity can have multiple Transport Identities (Socket IDs). [cite_start]Closing one tab must not log the user out entirely[cite: 96, 97].

**The Solution ("Two Phonebooks"):**
[cite_start]We are using native JavaScript Maps and Sets to cross-reference state[cite: 104, 122]:
1. `socketToUser` (`Map<string, string>`): Maps a `socket.id` to a `username`. [cite_start]Used for instant O(1) user identification on disconnect[cite: 117, 118, 173].
2. `userToSockets` (`Map<string, Set<string>>`): Maps a `username` to a `Set` of active `socket.id`s. [cite_start]Used to track if a user has multiple tabs open and determine true online/offline status[cite: 120, 121, 174, 176].

**Current Milestone:**
- [cite_start]Implementing `addUser`, `removeUser`, and `getOnlineUsers` logic[cite: 181].

---

# DEVELOPMENT WORKFLOW
After every stable milestone:
1. [cite_start]Test behavior carefully[cite: 164].
2. [cite_start]Observe realtime lifecycle[cite: 164].
3. [cite_start]Debug intentionally[cite: 164].
4. [cite_start]Make Git commit[cite: 165].

---

# CURRENT STATE: TRANSPORT WIRING & BACKEND PRESENCE (COMPLETED)

We have successfully built and wired the In-Memory Presence Architecture.

**Architectural Milestone Achieved:**
State management is now strictly decoupled from network transport.
- **State Layer (`presence.ts`):** Handles all O(1) logic for adding, removing, and listing users using Maps and Sets.
- **Transport Layer (`socket/index.ts`):** Purely handles network traffic, emitting, and listening, delegating all state changes to `presence.ts`.

**New Custom Events Registered:**
- `socket.on("join", (username))`: Calls `addUser` and logs the new state.
- `socket.on("disconnect")`: Calls `removeUser` and logs the cleaned-up state.

**Next Immediate Goal:**
Build the Frontend Trigger (Next.js guest login UI) to emit the `"join"` event and visually test the Multi-Tab Architecture via terminal logs.

# CURRENT STATE: FRONTEND RECEIVER & GLOBAL BROADCASTING (COMPLETED)

We have successfully wired the frontend to listen for global state changes.

**Architectural Milestone Achieved:**
- **Server Broadcasting:** The backend correctly uses `io.emit` (for self + others) and `socket.broadcast.emit` (for others only) to aggressively push state changes down to clients.
- **Client Reactivity:** The Next.js frontend uses a strict `useEffect` pattern with an empty dependency array `[]` and a cleanup function (`socket.off`) to prevent React re-render loops and memory leaks.
- **Form State:** Implemented `e.preventDefault()` to prevent standard HTTP form submissions from destroying the persistent WebSocket connection.

**Next Immediate Goal:**
Transitioning from Global Broadcasting to Scoped Broadcasting (Rooms).