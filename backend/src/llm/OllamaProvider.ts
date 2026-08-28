import { environment } from "../config/environment.ts";
import type { ChatMessage } from "../models/ChatMessage.ts";
import type { ILLMProvider } from "./ILLMProvider.ts";
import { QwenClient } from "./QwenClient.ts";
export class OllamaProvider implements ILLMProvider { private readonly client: QwenClient; constructor(client = new QwenClient()) { this.client = client; } async healthCheck(): Promise<void> { const models = await this.client.listModels(); if (!models.includes(environment.ollamaModel)) throw new Error(`El modelo ${environment.ollamaModel} no está disponible. Ejecute: ollama pull ${environment.ollamaModel}`); } generate(messages: ChatMessage[]): Promise<string> { return this.client.chat(messages); } }
