import { readFile } from "node:fs/promises";
import pdf from "pdf-parse";
import { log } from "../config/constants.ts";

export async function loadPdf(path: string): Promise<string> {
  try {
    const source = await readFile(path);
    if (!source.length) { await log(`Documento vacío: ${path}`, true); return ""; }
    if (!source.subarray(0, 4).equals(Buffer.from("%PDF"))) {
      await log(`El archivo ${path} no tiene una firma PDF válida; se procesa como texto plano.`);
      return normalizeExtractedText(source.toString("utf8"));
    }
    const result = await pdf(source);
    if (!result.text.trim()) { await log(`PDF sin texto extraíble: ${path}`, true); return ""; }
    await log(`PDF cargado: ${path} (${result.numpages} páginas)`);
    return normalizeExtractedText(result.text);
  } catch (error) {
    await log(`Error cargando PDF ${path}: ${error instanceof Error ? error.message : String(error)}`, true);
    throw error;
  }
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
