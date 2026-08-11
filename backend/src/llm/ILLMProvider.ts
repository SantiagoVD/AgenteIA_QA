import type { ChatMessage } from "../models/ChatMessage.ts";
import type { ArchitectureVisualAnalysis } from "../models/ArchitectureVisualAnalysis.ts";
export interface ILLMProvider { generate(messages: ChatMessage[]): Promise<string>; analyzeArchitectureImage(imageBase64: string, mimeType: string): Promise<ArchitectureVisualAnalysis>; healthCheck(): Promise<void>; }
