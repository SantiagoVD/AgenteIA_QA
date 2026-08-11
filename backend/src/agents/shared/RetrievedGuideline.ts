import type { ValidationPriority } from "./AgentValidationResponse.ts";

export interface RetrievedGuideline {
  ruleId: string;
  title: string;
  priority: ValidationPriority;
  content: string;
  document: string;
  section: string | null;
  matchedQueries: string[];
}

export function parseRetrievedGuideline(chunk: string, document: string, matchedQueries: string[] = []): RetrievedGuideline | null {
  const ruleId = chunk.match(/RULE_ID:\s*([A-Z0-9-]+)/i)?.[1];
  if (!ruleId) return null;
  const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const titleLine = lines.find((line) => line.includes("—")) ?? lines[1] ?? ruleId;
  const title = titleLine.replace(/^.*?—\s*/, "").trim();
  const rawPriority = field(chunk, "Prioridad").toUpperCase();
  const priority: ValidationPriority = /CRITICAL|CRÍTICA/.test(rawPriority) ? "CRITICAL" : /HIGH|ALTA/.test(rawPriority) ? "HIGH" : /LOW|BAJA/.test(rawPriority) ? "LOW" : "MEDIUM";
  return { ruleId, title, priority, content: chunk, document, section: field(chunk, "Categoría") || null, matchedQueries };
}

export function retrieveGuidelines(chunks: string[], queries: string[], document: string, perQuery: number, limit: number): RetrievedGuideline[] {
  const parsed = chunks.map((chunk) => parseRetrievedGuideline(chunk, document)).filter((item): item is RetrievedGuideline => item !== null);
  const selected = new Map<string, RetrievedGuideline>();
  for (const query of queries) {
    const focusedQuery = query.split(/\.\s*Elementos observados:/i)[0];
    const queryTerms = terms(focusedQuery);
    const ranked = parsed.map((rule) => ({ rule, score: overlap(queryTerms, terms(`${rule.title} ${rule.content}`)) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || left.rule.ruleId.localeCompare(right.rule.ruleId))
      .slice(0, perQuery);
    for (const { rule } of ranked) {
      const current = selected.get(rule.ruleId);
      if (current) current.matchedQueries.push(focusedQuery); else selected.set(rule.ruleId, { ...rule, matchedQueries: [focusedQuery] });
    }
  }
  return [...selected.values()].slice(0, limit);
}

function field(content: string, name: string): string {
  return content.match(new RegExp(`${name}\\s*\\n([^\\n]+)`, "i"))?.[1]?.trim() ?? "";
}

function terms(value: string): Set<string> { return new Set(value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g)?.filter((term) => term.length >= 4) ?? []); }
function overlap(query: Set<string>, content: Set<string>): number { let score = 0; for (const term of query) if (content.has(term)) score++; return score / Math.max(query.size, 1); }
