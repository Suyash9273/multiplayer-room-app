export interface ChatMessage {
  id: string;
  roomId: string;
  message: string;
  sender: string;
  timestamp: number;
  status: "pending" | "sent";
  type?: "USER" | "SYSTEM"; //Added the discriminator

  isRead?: boolean;   // add
  readAt?: number;    // add (unix timestamp like the rest)
}

export const getDMRoomId = (userId1: string, userId2: string) => {
  const sortedIds = [userId1, userId2].sort()
  return `dm:${sortedIds[0]}:${sortedIds[1]}`
}

export interface FriendAcceptedPayload {
    friendshipId: string;
    friend: {
        id: string;
        username: string | null;
        name: string ;
    }
}