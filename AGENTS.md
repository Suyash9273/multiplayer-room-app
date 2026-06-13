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

---

# CURRENT STATE: ROOM PRESENCE ARCHITECTURE (COMPLETED)

We have successfully built the In-Memory Room Architecture.

**Architectural Milestone Achieved:**
- **Tracking Transports, Not Identities:** To solve the Room Multi-Tab Problem, `roomToSockets` tracks `Set<socketId>` instead of usernames. 
- **O(K) Derivation:** `getUsersInRoom` derives the unique username list in O(K) time (where K is room size) by cross-referencing `socketToUser`.
- **Lifecycle Garbage Collection:** Intercepting the `disconnecting` event allows us to read `socket.rooms` and safely scrub the user from all custom room maps before the socket is fully destroyed.

**Next Immediate Goal:**
Wire the transport layer to handle specific room joining and scoped broadcasting (`io.to(room).emit`).

---

# CURRENT STATE: ROOM TRANSPORT & SCOPED BROADCASTING (COMPLETED)

We have successfully wired the transport layer to handle Rooms.

**Architectural Milestone Achieved:**
- **Network/Memory Sync:** The `enterRoom` and `leaveRoom` socket events strictly synchronize Socket.IO's native network rooms (`socket.join`/`socket.leave`) with our custom O(1) memory maps.
- **Scoped Broadcasting:** The server uses `io.to(room).emit` to push roster updates *only* to the specific clients residing within that room, preserving bandwidth and client-side performance.

**Next Immediate Goal:**
Build the Frontend Room UI to emit `enterRoom`/`leaveRoom` events, track `roomUsers` state, and handle scoped room events without breaking the global presence system.

---

# CURRENT STATE: FRONTEND ROOM UI (COMPLETED)

We have successfully built the frontend UI to consume the scoped room state.

**Architectural Milestone Achieved:**
- **SPA Switchboard:** Decoupled `page.tsx` into a strict phase-based router (Login -> Lobby -> Room) based solely on volatile realtime state (`isJoined`, `currentRoom`).
- **Context API:** Consolidated all socket listeners and global state into `SocketContext.tsx` to serve as the single source of truth, preventing React render-loop bugs and duplicate socket listeners.

**Next Immediate Goal:**
Implement scoped data transmission (e.g., actual chat messaging) inside the rooms.

---

# CURRENT STATE: DATA TRANSMISSION / CHAT (COMPLETED)

We have successfully built the core chat pipeline.

**Architectural Milestone Achieved:**
- **The Event Contract:** Created a Single Source of Truth (`@multiplayer/shared`) using pnpm workspaces to enforce the `ChatMessage` interface across both the Express backend and Next.js frontend.
- **Optimistic UI vs. Network Receivers:** The frontend updates local state instantly for the sender (Optimistic), while relying on `socket.on("receiveMessage")` to append data from others.
- **Scoped Routing:** The backend leverages `socket.to(roomId).emit()` to efficiently broadcast payloads to room members excluding the sender.

**Next Immediate Goal:**
Implement Transient State (Typing Indicators) to understand realtime events that have a start and end lifecycle.

---
# CURRENT STATE: TRANSIENT STATE (COMPLETED)

We successfully implemented debounced typing indicators.

**Architectural Milestone Achieved:**
- **Debouncing:** Utilized `useRef` and `setTimeout/clearTimeout` on the frontend to prevent network flooding, effectively transforming rapid keystrokes into singular "start" and "stop" events.
- **Identity Trust:** The backend extracts the user's identity from the `$O(1)$` memory state (`socketToUser`) rather than trusting a frontend payload.
- **Set State Mutation:** Used functional state updaters in React with `Set` conversion logic to safely add/remove typing users without stale-closure bugs.

**Next Immediate Goal:**
Implement Delivery Guarantees (Event Acknowledgments) to handle network failures and synchronize optimistic UI state.

---

# CURRENT STATE: DELIVERY GUARANTEES (COMPLETED)

We successfully implemented event acknowledgments (ACKs).

**Architectural Milestone Achieved:**
- **Event Contracts:** Upgraded the `ChatMessage` interface to include a cryptographically unique `id` and a `status` union type (`"pending" | "sent"`).
- **Optimistic UI:** The frontend immediately renders the message locally to ensure a zero-latency UX.
- **Socket Acknowledgments:** Utilized Socket.IO's callback mechanism to act as a receipt. The server processes the broadcast and fires the callback, allowing the frontend to confidently flip the message status from pending to sent.

**Next Immediate Goal:**
Address the "Late Joiner" problem by introducing Persistence (Chat History).

---

# CURRENT STATE: PERSISTENCE - WRITE (COMPLETED)

We successfully implemented the database layer to solve the "Amnesia" problem.

**Architectural Milestone Achieved:**
- **Monorepo DB Package:** Created a strictly-typed `@multiplayer/db` package using ESM (`NodeNext`).
- **Prisma V7 Adapters:** Bypassed the heavy Rust engine by implementing the new `@prisma/adapter-pg` driver adapter, ensuring our database package is edge-ready.
- **Background Writes:** Upgraded the Express socket router to perform asynchronous Network I/O, saving the `ChatMessage` payload to Supabase while maintaining zero-latency routing for the connected clients.

**Next Immediate Goal:**
Implement Persistence (The Read) to solve the "Late Joiner" problem by delivering chat history upon connection.

---

# CURRENT STATE: PERSISTENCE - READ BACKEND (COMPLETED)

We successfully built the REST API to serve historical data.

**Architectural Milestone Achieved:**
- **Separation of Protocols:** We decoupled data fetching from data streaming. We use HTTP `GET` requests to load heavy historical arrays, preserving our WebSocket connection purely for lightning-fast live deltas.
- **Server Fusion:** Successfully attached the Express request handler to the raw Node HTTP server to serve both REST routes and Socket.IO upgrades on the same port.

**Next Immediate Goal:**
Connect the React frontend to the REST API to finally solve the "Late Joiner" problem on the screen.