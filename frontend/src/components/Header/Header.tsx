import styles from "./Header.module.css";

/** Identifies the product and its scope. */
export function Header() {
  return <header className={styles.header}>
    <div className={styles.mark} aria-hidden="true">◇</div>
    <div><h1>Architecture Agent</h1><p>Consultas basadas en tus lineamientos de arquitectura</p></div>
    <span className={styles.status}><i />RAG activo</span>
  </header>;
}
