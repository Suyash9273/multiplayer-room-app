export interface ChatMessage {
  id: string;
  roomId: string;
  message: string;
  sender: string;
  timestamp: number;
  status: "pending" | "sent";
  type?: "USER" | "SYSTEM"; //Added the discriminator
}

export const getDMRoomId = (userId1: string, userId2: string) => {
  const sortedIds = [userId1, userId2].sort()
  return `dm:${sortedIds.join(":")}`
}