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