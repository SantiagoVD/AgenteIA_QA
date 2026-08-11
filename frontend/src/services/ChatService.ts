import type { ChatAttachment, ChatHistoryMessage, ChatRequest } from "@/types/ChatRequest";
import type { ChatResponse } from "@/types/ChatResponse";

/** HTTP boundary for the future chat API. */
export const ChatService = {
  async sendMessage(message: string, attachments: ChatAttachment[] = [], history: ChatHistoryMessage[] = []): Promise<ChatResponse> {
    const request: ChatRequest = { message, attachments, history };
    const endpoint = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api/chat";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { error?: string; requestId?: string };
      const trace = detail.requestId ? ` (traza: ${detail.requestId})` : "";
      throw new Error(`${detail.error || "No fue posible obtener una respuesta del agente."}${trace}`);
    }

    return (await response.json()) as ChatResponse;
  },
};
