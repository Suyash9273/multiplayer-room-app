export interface ChatMessage {
  id: string;
  roomId: string;
  message: string;
  
  // Replaces the old single `sender` string. 
  // senderId maps to either a User.id or GuestIdentity.id.
  senderId?: string; 
  
  // Replaces the need for complex lookups on the frontend.
  // Contains "Stranger", "System", or the actual User's name.
  senderDisplayName: string; 
  
  timestamp: number;
  status: "pending" | "sent";
  type?: "USER" | "SYSTEM";

  isRead?: boolean;   
  readAt?: number;    
}

// export const getDMRoomId = (userId1: string, userId2: string) => {
//   const sortedIds = [userId1, userId2].sort()
//   return `dm:${sortedIds[0]}:${sortedIds[1]}`
// }
// NOTE: We REMOVED the `getDMRoomId` helper. 
// String sorting for rooms (dm:user1:user2) is officially dead.
// All rooms will now have a true database-generated UUID.

export interface FriendAcceptedPayload {
    friendshipId: string;
    friend: {
        id: string;
        username: string | null;
        name: string ;
    }
}

// Define Room types to ensure frontend and backend route logic matches safely
export type RoomType = "DIRECT" | "GROUP" | "ANONYMOUS";

// --- IDENTITY ---
// Normalized shape both the socket layer and REST layer resolve every
// connection/request down to, regardless of whether it came from a real
// Better Auth session or a minted guest token. Downstream code (handlers,
// routes, presence) should only ever read `Identity`, never reach into
// `socket.data.user` or `socket.data.guestId` separately — that split is
// exactly what let the anonymous path fall through the cracks before.
export type Identity = {
    type: "user" | "guest";
    id: string;            // User.id or GuestIdentity.id
    displayName: string;   // Resolved server-side, never trust a client value
};

// Name of the httpOnly cookie that carries a guest's opaque token.
// Shared so the mint route, the socket middleware, and the REST middleware
// all agree on the cookie name without hardcoding it three times.
export const GUEST_COOKIE_NAME = "guest_token";

// What POST /api/guest returns to the client. Only the non-secret parts —
// the actual token stays server-side inside the httpOnly cookie and is
// never exposed to JS.
export type GuestMintResponse = {
    id: string;
    displayName: string;
};
