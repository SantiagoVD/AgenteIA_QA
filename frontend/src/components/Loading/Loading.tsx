import styles from "./Loading.module.css";

/** Small non-blocking indicator while the agent response is pending. */
export function Loading() {
  return <div className={styles.loading} role="status" aria-label="El agente está respondiendo"><i /><i /><i /></div>;
}
