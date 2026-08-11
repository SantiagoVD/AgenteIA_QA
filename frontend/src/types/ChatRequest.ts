export interface ChatAttachment {
  name: string;
  type: string;
  content: string;
}

export interface ChatHistoryMessage {
  sender: "user" | "agent";
  text: string;
}

/** Payload sent by the frontend to the chat endpoint. */
export interface ChatRequest {
  message: string;
  attachments?: ChatAttachment[];
  history?: ChatHistoryMessage[];
}
