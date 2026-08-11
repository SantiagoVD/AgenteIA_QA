import { ChangeEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import type { ChatAttachment } from "@/types/ChatRequest";
import styles from "./ChatInput.module.css";

interface ChatInputProps {
  isLoading: boolean;
  onSend: (message: string, attachments?: ChatAttachment[]) => Promise<void>;
}

/** Captures a question plus documents and one architecture image. */
export function ChatInput({ isLoading, onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = text.trim();
    if ((!message && files.length === 0) || isLoading) return;

    const attachments = await Promise.all(files.map(toAttachment));
    setText("");
    setFiles([]);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await onSend(message || "Analiza los archivos adjuntos.", attachments);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const allFiles = [...files, ...Array.from(event.target.files ?? [])];
    if (allFiles.length > 3) {
      window.alert("Puedes adjuntar como máximo 3 archivos por consulta.");
      return;
    }
    const imageFiles = allFiles.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length > 1) {
      window.alert("Adjunta un solo diagrama o imagen por consulta.");
      return;
    }
    const tooLarge = allFiles.find((file) => file.size > (file.type.startsWith("image/") ? 10 : 5) * 1024 * 1024);
    if (tooLarge) {
      window.alert(`El archivo ${tooLarge.name} supera el límite permitido.`);
      return;
    }
    setFiles(allFiles);
    const image = imageFiles[0];
    if (image) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(typeof reader.result === "string" ? reader.result : null);
      reader.readAsDataURL(image);
    }
  };

  const removeFile = (index: number) => {
    setFiles((current) => {
      const removed = current[index];
      if (removed?.type.startsWith("image/")) setImagePreview(null);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      {imagePreview && <div className={styles.preview}>
        <img src={imagePreview} alt="Vista previa del diagrama adjunto" />
        <span>Diagrama listo para analizar</span>
      </div>}
      {files.length > 0 && <div className={styles.files} aria-label="Archivos adjuntos">
        {files.map((file, index) => <span className={styles.file} key={`${file.name}-${index}`}>
          <span>{file.name}</span>
          <button type="button" onClick={() => removeFile(index)} disabled={isLoading} aria-label={`Quitar ${file.name}`}>×</button>
        </span>)}
      </div>}
      <div className={styles.controls}>
        <input ref={fileInputRef} id="chat-files" className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/webp,.pdf,.txt,.md,.csv,.json,.xml" multiple onChange={onFilesChange} disabled={isLoading} />
        <label className={styles.attach} htmlFor="chat-files" title="Adjuntar diagrama o documento"><span aria-hidden="true">+</span> Adjuntar</label>
        <label className="sr-only" htmlFor="chat-message">Escribe tu consulta</label>
        <textarea id="chat-message" className={styles.input} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} placeholder="Pregunta o adjunta un diagrama de arquitectura..." rows={1} disabled={isLoading} />
        <button className={styles.button} type="submit" disabled={(!text.trim() && files.length === 0) || isLoading}>Enviar</button>
      </div>
    </form>
  );
}

function toAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No fue posible leer ${file.name}.`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const content = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      resolve({ name: file.name, type: file.type || "text/plain", content });
    };
    reader.readAsDataURL(file);
  });
}
