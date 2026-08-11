import { constants } from "../config/constants.ts";

/** Keeps every RAG rule intact; introductory text never competes with validation rules. */
export function chunkText(text: string): string[] {
  const rules = [...text.matchAll(/={3}\s*BEGIN RULE\s+([A-Z0-9-]+)\s*={3}([\s\S]*?)={3}\s*END RULE\s+\1\s*={3}/g)]
    .map((match) => `RULE_ID: ${match[1]}\n${match[2].trim()}`)
    .filter(Boolean);
  if (rules.length > 0) return rules;

  const paragraphs = text.replace(/\r/g, "").split(/\n\s*\n+/).map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > constants.chunkSize && current) { chunks.push(current); current = paragraph; }
    else current = `${current}\n\n${paragraph}`.trim();
  }
  if (current) chunks.push(current);
  return chunks;
}
