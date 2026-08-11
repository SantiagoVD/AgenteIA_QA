import { environment } from "../config/environment.ts";
import type { ChatMessage } from "../models/ChatMessage.ts";
import type { ILLMProvider } from "./ILLMProvider.ts";
import { QwenClient } from "./QwenClient.ts";
import { ArchitectureVisionAnalyzer } from "../vision/ArchitectureVisionAnalyzer.ts";
import type { ArchitectureVisualAnalysis } from "../models/ArchitectureVisualAnalysis.ts";

export class OllamaProvider implements ILLMProvider {
  private readonly client: QwenClient;
  constructor(client = new QwenClient()) { this.client = client; }
  async healthCheck(): Promise<void> {
    const models = await this.client.listModels();
    if (!models.includes(environment.ollamaModel)) throw new Error(`El modelo ${environment.ollamaModel} no está disponible. Ejecute: ollama pull ${environment.ollamaModel}`);
  }
  generate(messages: ChatMessage[]): Promise<string> { return this.client.chat(messages); }
  analyzeArchitectureImage(imageBase64: string, mimeType: string): Promise<ArchitectureVisualAnalysis> { return new ArchitectureVisionAnalyzer(this.client).analyze(imageBase64, mimeType); }
}
