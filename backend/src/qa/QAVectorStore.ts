import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { embed, cosineSimilarity } from "../ingestion/EmbeddingGenerator.ts";
import type { QAGuideline } from "./Guideline.ts";
export interface QAVector { guideline: QAGuideline; vector: number[]; }
export class QAVectorStore { private readonly vectors: QAVector[]; private constructor(vectors: QAVector[]) { this.vectors = vectors; } static async open(guidelines: QAGuideline[], cachePath: string): Promise<QAVectorStore> { const fingerprint = createHash("sha256").update(JSON.stringify(guidelines)).digest("hex"); try { const cached = JSON.parse(await readFile(cachePath, "utf8")) as { fingerprint: string; vectors: QAVector[] }; if (cached.fingerprint === fingerprint && Array.isArray(cached.vectors)) return new QAVectorStore(cached.vectors); } catch { /* cache miss */ } const vectors = guidelines.map(guideline => ({ guideline, vector: embed(guideline.text) })); await mkdir(dirname(cachePath), { recursive: true }); await writeFile(cachePath, JSON.stringify({ fingerprint, vectors })); return new QAVectorStore(vectors); }
  search(query: string, limit = 6, domains?: string[]): QAGuideline[] { const q = embed(query); return this.vectors.filter(x => !domains || domains.includes(x.guideline.domain)).map(x => ({ guideline: x.guideline, score: cosineSimilarity(q, x.vector) })).sort((a,b) => b.score - a.score).slice(0, Math.max(1, limit)).map(x => x.guideline); }
}
