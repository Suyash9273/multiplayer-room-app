import type { Server, Socket, DefaultEventsMap } from "socket.io";
import type { Identity } from "@multiplayer/shared";

// `Socket.data` (and the server's corresponding generic) default to `any`
// in Socket.IO's own types. Rather than trying to widen that via `declare
// module` augmentation on a generic class (which doesn't merge cleanly),
// we pin the generic explicitly through this one shared type and use it
// everywhere a socket/server is touched — index.ts, every handler module,
// and presence.ts all agree on the exact same shape.
export type AppSocketData = { identity: Identity };

export type AppSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, AppSocketData>;

export type AppServer = Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, AppSocketData>;
