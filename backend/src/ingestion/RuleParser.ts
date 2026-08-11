export interface ArchitectureRule {
  ruleId: string; title: string; category: string; priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  mandatory: boolean | null; visualVerifiability: string | null; tags: string[]; document: string; domain: string; content: string;
}

export function parseRules(text: string, document: string, domain: string): ArchitectureRule[] {
  return [...text.matchAll(/={3}\s*BEGIN RULE\s+([A-Z0-9-]+)\s*={3}([\s\S]*?)={3}\s*END RULE\s+\1\s*={3}/g)].map((match) => {
    const content = match[2].trim();
    const line = content.split(/\n/).find(Boolean) ?? match[1];
    const field = (name: string) => content.match(new RegExp(`${name}\\s*\\n([^\\n]+)`, "i"))?.[1]?.trim() ?? "";
    const tags = (content.match(/Etiquetas de recuperación:\s*([^\n]+)/i)?.[1] ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
    const priorityRaw = field("Prioridad").toUpperCase();
    return { ruleId: match[1], title: line.replace(/^.*?—\s*/, "").trim(), category: field("Categoría"), priority: priorityRaw === "CRÍTICA" || priorityRaw === "CRITICAL" ? "CRITICAL" : priorityRaw === "ALTA" || priorityRaw === "HIGH" ? "HIGH" : priorityRaw === "BAJA" || priorityRaw === "LOW" ? "LOW" : "MEDIUM", mandatory: /obligatorio/i.test(field("Obligatoriedad")) ? true : null, visualVerifiability: field("Tipo de verificación") || null, tags, document, domain, content };
  });
}
