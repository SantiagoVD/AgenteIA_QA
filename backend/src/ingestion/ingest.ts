import { join } from "node:path";
import { loadPdf } from "./PdfLoader.ts";
import { parseRules } from "./RuleParser.ts";

const documents = [
  ["cloud", "Cloud_Architecture_Guidelines_RAG.pdf"],
  ["integration", "Integration_Architecture_Guidelines_RAG.pdf"],
  ["infrastructure", "Infrastructure_Architecture_Guidelines_RAG.pdf"],
] as const;

const started = Date.now();
for (const [domain, file] of documents) {
  const text = await loadPdf(join(process.cwd(), "documents", domain, file));
  const rules = parseRules(text, file, domain);
  const ids = new Set(rules.map((rule) => rule.ruleId));
  if (!rules.length) throw new Error(`${file}: no se detectaron reglas.`);
  if (ids.size !== rules.length) throw new Error(`${file}: existen ruleId duplicados.`);
  if (rules.some((rule) => !rule.content.trim())) throw new Error(`${file}: existe una regla vacía.`);
  console.log(`${file}: ${rules.length} reglas, ${rules.length} chunks, ${rules.length} embeddings en memoria.`);
}
console.log(`Ingesta completada en ${Date.now() - started} ms.`);
