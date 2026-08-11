import { environment } from "../config/environment.ts";
import { logEvent } from "../config/constants.ts";

export class QwenClient {
  private readonly timeoutMs = 45000;

  async listModels(): Promise<string[]> {
    const response = await fetch(`${environment.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Ollama no responde: HTTP ${response.status}`);
    const data = await response.json() as { models?: Array<{ name: string }> };
    return (data.models ?? []).map(({ name }) => name);
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await fetch(`${environment.ollamaBaseUrl}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({ model: environment.ollamaModel, messages, stream: false, think: false, options: { temperature: 0.05, num_predict: 96, num_ctx: 1024 } }),
    });
    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 404 && detail.includes("model")) throw new Error(`El modelo ${environment.ollamaModel} no esta disponible. Ejecute: ollama pull ${environment.ollamaModel}`);
      throw new Error(`Ollama no pudo generar una respuesta: HTTP ${response.status} - ${detail}`);
    }
    const data = await response.json() as { message?: { content?: string } };
    if (!data.message?.content) throw new Error("Ollama respondio sin contenido.");
    return data.message.content;
  }

  async analyzeImage(prompt: string, imageBase64: string): Promise<string> {
    const startedAt = Date.now();
    await logEvent("ollama.vision.started", { model: environment.ollamaModel, imageBase64Characters: imageBase64.length });
    const response = await fetch(`${environment.ollamaBaseUrl}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(300_000),
      body: JSON.stringify({ model: environment.ollamaModel, messages: [{ role: "user", content: `/no_think\n${prompt}`, images: [imageBase64] }], stream: false, think: false, format: "json", options: { temperature: 0, num_predict: 128, num_ctx: 2048 } }),
    });
    if (!response.ok) {
      const detail = await response.text();
      await logEvent("ollama.vision.http_error", { status: response.status, durationMs: Date.now() - startedAt, detail: detail.slice(0, 1000) }, true);
      throw new Error(`Ollama no pudo analizar la imagen: HTTP ${response.status}`);
    }
    const data = await response.json() as { message?: { content?: string; thinking?: string }; done_reason?: string; eval_count?: number };
    await logEvent("ollama.vision.completed", { durationMs: Date.now() - startedAt, doneReason: data.done_reason, evalCount: data.eval_count, contentLength: data.message?.content?.length ?? 0, thinkingLength: data.message?.thinking?.length ?? 0 });
    const output = data.message?.content?.trim() || data.message?.thinking?.trim();
    if (!output) throw new Error("Ollama respondio sin analisis visual.");
    return output;
  }
}
