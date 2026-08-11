import type { ChatAttachment } from "./ChatRequest";

/** A single item shown in the conversation. */
export interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  attachments?: ChatAttachment[];
}
