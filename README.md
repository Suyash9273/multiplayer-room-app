# Multiplayer Room App

A learning-focused realtime application built to deeply understand:

- WebSockets
- Socket.IO
- realtime architecture
- persistent connections
- event-driven systems
- monorepo workflows
- online presence systems

The project is gradually evolving toward a simplified Discord/ChitChat-style realtime system.

---

# Current Goals

This project is intentionally being built layer-by-layer to learn:

- connection lifecycle
- rooms
- broadcasts
- online user tracking
- disconnect cleanup
- realtime state management
- frontend/backend synchronization

The goal is NOT to blindly build a chat app.

The goal is to understand how realtime systems actually work internally.

---

# Tech Stack

## Frontend
- Next.js (App Router)
- TypeScript
- TailwindCSS
- socket.io-client

## Backend
- Node.js
- Express
- Socket.IO
- TypeScript

## Monorepo Tooling
- pnpm workspaces

---

# Monorepo Architecture

```txt
multiplayer-room-app/
│
├── apps/
│   ├── web/        # Next.js frontend
│   └── server/     # Express + Socket.IO backend
│
├── packages/
│
├── README.md
├── AGENTS.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── .gitignore
```

---

# Workspace Configuration

`pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

There is ONLY ONE:
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

at the root level.

---

# Current Backend Architecture

Backend lives inside:

```txt
apps/server
```

## Current Features

- Raw Node.js HTTP server
- Socket.IO server attached to HTTP server
- Connection lifecycle logging
- Disconnect lifecycle logging
- TypeScript support
- Realtime infrastructure setup

---

# Current Frontend Architecture

Frontend lives inside:

```txt
apps/web
```

## Current Features

- Next.js App Router setup
- Client-side socket connection
- Singleton socket architecture
- Socket lifecycle observation

---

# Socket Architecture

Current socket connection flow:

```txt
Browser
   ↕
Socket.IO Client
   ↕
Socket.IO Server
   ↕
Raw HTTP Server
```

---

# Important Concepts Learned So Far

## 1. Socket.IO Attaches To HTTP Server

Socket.IO does NOT attach directly to Express.

Instead:

```txt
Express App
    ↓
HTTP Server
    ↓
Socket.IO
```

This is because WebSockets begin as HTTP upgrade requests.

---

## 2. Realtime Systems Are Stateful

REST:

```txt
request → response → forget
```

Realtime:

```txt
connect → persistent lifecycle → ongoing events
```

The server now maintains:
- active connections
- socket lifecycle
- realtime state

---

## 3. Socket Identity ≠ User Identity

Each browser tab creates:
- a new socket connection
- a new socket.id

Refreshing the page:
- disconnects old socket
- creates new socket

This is a critical realtime architecture concept.

---

## 4. Singleton Socket Client

Frontend socket connection is centralized inside:

```txt
src/lib/socket.ts
```

This avoids:
- duplicate connections
- duplicate listeners
- memory leaks
- ghost events

---

# Current Socket Lifecycle

## Backend

Logs:
- socket connect
- socket disconnect

## Frontend

Logs:
- connect event
- disconnect event

---

# Current Learning Stage

We are currently transitioning from:
- automatic lifecycle events

to:
- custom realtime events

Next planned milestone:

```txt
User joins with username
```

This will introduce:
- custom socket events
- server-side presence tracking
- realtime state management

---

# Planned Roadmap

## Phase 1 — Core Realtime Infrastructure
- socket lifecycle
- rooms
- online users
- messaging
- disconnect cleanup

## Phase 2 — UX Improvements
- typing indicators
- join/leave notifications
- reconnect handling

## Phase 3 — Persistence
- database
- saved messages
- room history

## Phase 4 — Production Architecture
- authentication
- Redis adapter
- scaling
- shared packages
- rate limiting

---

# Running The Project

## Install Dependencies

From root:

```bash
pnpm install
```

---

## Run Backend

```bash
pnpm --filter server dev
```

---

## Run Frontend

```bash
pnpm --filter web dev
```

---

# Important Development Philosophy

This project is intentionally being built:
- incrementally
- experimentally
- architecture-first

The focus is on:
- understanding systems deeply
- reasoning about realtime behavior
- debugging lifecycle issues
- building engineering intuition

Not on blindly following tutorials.