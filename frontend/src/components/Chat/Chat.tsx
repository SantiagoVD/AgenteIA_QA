import { useEffect, useRef } from "react";
import { ChatInput } from "@/components/ChatInput/ChatInput";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Loading } from "@/components/Loading/Loading";
import { Message } from "@/components/Message/Message";
import type { Message as MessageModel } from "@/types/Message";
import type { ChatAttachment } from "@/types/ChatRequest";
import styles from "./Chat.module.css";

interface ChatProps { messages: MessageModel[]; isLoading: boolean; error: string | null; sendMessage: (message: string, attachments?: ChatAttachment[]) => Promise<void>; }

/** Owns the scrollable conversation layout and composes chat UI components. */
export function Chat({ messages, isLoading, error, sendMessage }: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading, error]);
  return (
    <div className={styles.chat}>
      <div className={styles.conversation} aria-live="polite">
        {messages.length === 0 && !isLoading ? <EmptyState /> : messages.map((message) => <Message key={message.id} message={message} />)}
        {isLoading && <Loading />}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div ref={bottomRef} />
      </div>
      <ChatInput isLoading={isLoading} onSend={sendMessage} />
    </div>
  );
}
