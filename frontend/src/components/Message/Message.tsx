import type { Message as MessageModel } from "@/types/Message";
import styles from "./Message.module.css";

interface MessageProps { message: MessageModel; }

/** Renders a conversation bubble with the appropriate speaker treatment. */
export function Message({ message }: MessageProps) {
  const isUser = message.sender === "user";
  return (
    <article className={`${styles.message} ${isUser ? styles.user : styles.agent}`}>
      <span className={styles.sender}>{isUser ? "Tú" : "Architecture Agent"}</span>
      <p>{message.text}</p>
      {message.attachments && message.attachments.length > 0 && <div className={styles.attachments}>
        {message.attachments.map((attachment) => attachment.type.startsWith("image/")
          ? <img key={attachment.name} src={`data:${attachment.type};base64,${attachment.content}`} alt={`Imagen adjunta: ${attachment.name}`} />
          : <span key={attachment.name}>{attachment.name}</span>)}
      </div>}
    </article>
  );
}
