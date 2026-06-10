export interface ChatMessage {
  id: string;
  roomId: string;
  message: string;
  sender: string;
  timestamp: number;
  status: "pending" | "sent"; 
}