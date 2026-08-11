import styles from "./EmptyState.module.css";

/** First-use guidance displayed before the conversation starts. */
export function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.icon} aria-hidden="true">◆</div>
      <h2>¿En qué puedo ayudarte?</h2>
      <p>Pregunta sobre APIs, cloud, infraestructura o adjunta un PDF, texto o imagen.</p>
    </div>
  );
}
