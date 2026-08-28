import type { ChatMessage } from "../models/ChatMessage.ts";
export interface ILLMProvider { generate(messages: ChatMessage[]): Promise<string>; healthCheck(): Promise<void>; }
