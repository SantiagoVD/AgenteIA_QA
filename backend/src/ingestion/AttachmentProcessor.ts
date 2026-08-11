import pdf from "pdf-parse";
import type { ChatAttachment } from "../models/ChatRequest.ts";
import { environment } from "../config/environment.ts";

const maxAttachmentBytes = environment.maxArchitectureImageBytes;
const acceptedTextTypes = new Set(["text/plain", "text/markdown", "text/csv", "application/json", "application/xml"]);

export interface ProcessedAttachments {
  documents: Array<{ name: string; text: string }>;
  imageNames: string[];
  architectureImage?: { name: string; type: string; content: string };
}

export async function processAttachments(attachments: ChatAttachment[] = []): Promise<ProcessedAttachments> {
  if (attachments.length > 3) throw new Error("Puedes adjuntar como maximo 3 archivos por consulta.");

  const documents: Array<{ name: string; text: string }> = [];
  const imageNames: string[] = [];
  let architectureImage: ProcessedAttachments["architectureImage"];

  for (const attachment of attachments) {
    validateAttachment(attachment);
    const binary = Buffer.from(attachment.content, "base64");

    if (attachment.type.startsWith("image/")) {
      if (!/^image\/(png|jpeg|webp)$/.test(attachment.type)) throw new Error("Solo se permiten imágenes PNG, JPEG o WebP.");
      if (architectureImage) throw new Error("Solo puedes adjuntar una imagen por consulta.");
      imageNames.push(attachment.name);
      architectureImage = { name: attachment.name, type: attachment.type, content: attachment.content };
      continue;
    }

    const text = attachment.type === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf")
      ? await extractPdfText(binary, attachment.name)
      : binary.toString("utf8");
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) throw new Error(`No fue posible extraer texto del archivo "${attachment.name}".`);
    documents.push({ name: attachment.name, text: cleaned.slice(0, 30_000) });
  }

  return { documents, imageNames, architectureImage };
}

function validateAttachment(attachment: ChatAttachment): void {
  if (!attachment || typeof attachment.name !== "string" || typeof attachment.type !== "string" || typeof attachment.content !== "string") {
    throw new Error("El formato de un archivo adjunto no es valido.");
  }
  if (!attachment.name.trim() || attachment.content.length === 0) throw new Error("El archivo adjunto no es valido.");
  if (Buffer.byteLength(attachment.content, "base64") > maxAttachmentBytes) throw new Error(`El archivo "${attachment.name}" supera el limite de 5 MB.`);
  const isPdf = attachment.type === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf");
  if (!isPdf && !attachment.type.startsWith("image/") && !acceptedTextTypes.has(attachment.type)) {
    throw new Error(`El tipo de archivo "${attachment.name}" no esta permitido. Usa PDF, texto, CSV, JSON o imagen.`);
  }
}

async function extractPdfText(binary: Buffer, name: string): Promise<string> {
  if (!binary.subarray(0, 4).equals(Buffer.from("%PDF"))) return binary.toString("utf8");
  try {
    return (await pdf(binary)).text;
  } catch {
    throw new Error(`No fue posible leer el PDF "${name}". Verifica que no sea un PDF escaneado o protegido.`);
  }
}
