import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { log, logEvent } from "../../config/constants.ts";
import { environment } from "../../config/environment.ts";
import { OrchestratorAgent } from "../../agents/orchestrator/OrchestratorAgent.ts";
import { OllamaProvider } from "../../llm/OllamaProvider.ts";
import type { ChatRequest } from "../../models/ChatRequest.ts";
import type { ChatResponse } from "../../models/ChatResponse.ts";
import { processAttachments } from "../../ingestion/AttachmentProcessor.ts";
import { detectArchitectureRequestMode } from "../../models/ArchitectureRequestMode.ts";

const llm = new OllamaProvider();
const orchestrator = new OrchestratorAgent(llm);

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Headers": "Content-Type" });
  response.end(JSON.stringify(body));
}
async function bodyOf(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    length += buffer.length;
    if (length > 16 * 1024 * 1024) throw new Error("La solicitud supera el limite de 16 MB.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") { response.writeHead(204, { "Access-Control-Allow-Origin": "http://localhost:3000", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }); response.end(); return; }
  if (request.method !== "POST" || request.url !== "/api/chat") { json(response, 404, { error: "Ruta no encontrada" }); return; }
  const requestId = randomUUID().slice(0, 8);
  const startedAt = Date.now();
  try {
    const payload = await bodyOf(request) as Partial<ChatRequest>;
    if (typeof payload.message !== "string" || !payload.message.trim()) { json(response, 400, { error: "El campo message es obligatorio." }); return; }
    const attachmentSummary = Array.isArray(payload.attachments) ? payload.attachments.map((item) => ({
      name: item?.name,
      type: item?.type,
      bytes: typeof item?.content === "string" ? Buffer.byteLength(item.content, "base64") : 0,
    })) : [];
    await logEvent("chat.request.received", { requestId, messageLength: payload.message.trim().length, attachments: attachmentSummary });
    const attachments = await processAttachments(payload.attachments);
    await logEvent("chat.attachments.processed", { requestId, documents: attachments.documents.map(({ name, text }) => ({ name, characters: text.length })), images: attachments.imageNames });
    const history = Array.isArray(payload.history) ? payload.history.slice(-8).filter((item) => item && (item.sender === "user" || item.sender === "agent") && typeof item.text === "string") : [];
    const mode = detectArchitectureRequestMode(Boolean(attachments.architectureImage), payload.message.trim());
    await logEvent("chat.orchestrator.started", { requestId, mode, historyMessages: history.length, hasArchitectureImage: Boolean(attachments.architectureImage) });
    const result: ChatResponse = { response: await orchestrator.answer(payload.message.trim(), attachments.documents, attachments.imageNames, history, attachments.architectureImage, requestId) };
    await logEvent("chat.request.completed", { requestId, durationMs: Date.now() - startedAt, responseLength: result.response.length });
    json(response, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    await logEvent("chat.request.failed", { requestId, durationMs: Date.now() - startedAt, error }, true);
    json(response, 503, { error: message, requestId });
  }
});

server.listen(environment.port, async () => {
  await log(`Backend iniciado en http://localhost:${environment.port}`);
  try { await llm.healthCheck(); await log(`Ollama conectado; modelo ${environment.ollamaModel} disponible.`); }
  catch (error) { await log(error instanceof Error ? error.message : String(error), true); }
});
