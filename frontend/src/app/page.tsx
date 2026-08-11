"use client";

import { Chat } from "@/components/Chat/Chat";
import { Header } from "@/components/Header/Header";
import { useChat } from "@/hooks/useChat";

export default function HomePage() {
  const chat = useChat();

  return (
    <main className="app-shell">
      <section className="chat-card" aria-label="Exchange Rate Agent">
        <Header />
        <Chat {...chat} />
      </section>
    </main>
  );
}
