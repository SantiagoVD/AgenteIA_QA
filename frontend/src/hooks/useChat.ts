import { useCallback, useState } from "react";
import { ChatService } from "@/services/ChatService";
import type { Message } from "@/types/Message";
import type { ChatAttachment, ChatHistoryMessage } from "@/types/ChatRequest";

const createMessage = (sender: Message["sender"], text: string, attachments: ChatAttachment[] = []): Message => ({
  id: crypto.randomUUID(),
  sender,
  text,
  attachments,
});

/** Keeps chat state and API interaction separate from presentation components. */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (text: string, attachments: ChatAttachment[] = []) => {
    const message = text.trim();
    if (!message || isLoading) return;

    setMessages((current) => [...current, createMessage("user", message, attachments)]);
    setError(null);
    setIsLoading(true);

    try {
      const history: ChatHistoryMessage[] = messages.slice(-8).map(({ sender, text }) => ({ sender, text }));
      const { response } = await ChatService.sendMessage(message, attachments, history);
      setMessages((current) => [...current, createMessage("agent", response)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  return { messages, isLoading, error, sendMessage };
}
