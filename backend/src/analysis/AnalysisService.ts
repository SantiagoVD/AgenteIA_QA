import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GitHubRepositoryService, validateGitHubUrl } from "../repository/GitHubRepositoryService.ts";
import { RepositoryScanner } from "../repository/RepositoryScanner.ts";
import { profileProject } from "../repository/ProjectProfiler.ts";
import { buildEvidence, type EvidenceChunk } from "../evidence/ProjectEvidenceStore.ts";
import { loadQAGuidelines } from "../qa/QAGuidelineLoader.ts";
import { QAVectorStore } from "../qa/QAVectorStore.ts";
import { runQAAgents } from "../qa/QAOrchestrator.ts";
import { consolidate } from "../qa/ComplianceAgent.ts";
import type { AnalysisReport } from "../models/Compliance.ts";
import { OllamaProvider } from "../llm/OllamaProvider.ts";

export type AnalysisStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export interface AnalysisState { analysisId: string; repositoryUrl: string; status: AnalysisStatus; phase: string; report?: AnalysisReport; error?: string; }
const phases = ["Validating repository", "Cloning repository", "Scanning project", "Profiling technologies", "Indexing evidence", "Retrieving QA guidelines", "Running QA agents", "Consolidating findings", "Generating report"] as const;

export class AnalysisService {
  private readonly states = new Map<string, AnalysisState>();
  private readonly evidence = new Map<string, EvidenceChunk[]>();
  private readonly repo: GitHubRepositoryService;
  private readonly scanner: RepositoryScanner;
  constructor(repo = new GitHubRepositoryService(), scanner = new RepositoryScanner()) { this.repo = repo; this.scanner = scanner; }
  create(repositoryUrl: string): AnalysisState { validateGitHubUrl(repositoryUrl); const state: AnalysisState = { analysisId: randomUUID(), repositoryUrl, status: "QUEUED", phase: phases[0] }; this.states.set(state.analysisId, state); void this.run(state); return state; }
  get(id: string): AnalysisState | undefined { return this.states.get(id); }
  getEvidence(id: string, relativePath?: string): EvidenceChunk[] { return (this.evidence.get(id) ?? []).filter(e => !relativePath || e.relativePath === relativePath); }
  private async run(state: AnalysisState): Promise<void> { let workspace: string | undefined; try { state.status = "PROCESSING"; state.phase = phases[1]; workspace = await this.repo.clone(state.repositoryUrl, state.analysisId); state.phase = phases[2]; const files = await this.scanner.scan(workspace); if (!files.length) throw new Error("El repositorio no contiene archivos analizables."); state.phase = phases[3]; const profile = profileProject(files); state.phase = phases[4]; const evidence = buildEvidence(state.analysisId, files); this.evidence.set(state.analysisId, evidence); await this.persistEvidence(state.analysisId, evidence); state.phase = phases[5]; const qaRoot = join(process.cwd(), "knowledge", "qa"); const guidelines = await loadQAGuidelines(qaRoot); const store = await QAVectorStore.open(guidelines, join(process.cwd(), "data", "qa-vector-store.json")); const query = `${profile.languages.join(" ")} ${profile.frameworks.join(" ")} ${profile.projectType.join(" ")} ${profile.hasTests ? "tests" : "testing"} ${profile.hasCI ? "continuous integration" : "security quality"}`; const domains = ["General QA", "Product Quality", "Testing", "Security"] as const; const retrieved = domains.flatMap(domain => store.search(`${domain} ${query}`, Number(process.env.QA_TOP_K ?? 10), [domain])); state.phase = phases[6]; let llm: OllamaProvider | undefined; if (process.env.QA_USE_OLLAMA === "true") { try { llm = new OllamaProvider(); await llm.healthCheck(); } catch { llm = undefined; } } const findings = await runQAAgents({ analysisId: state.analysisId, profile, evidence, guidelines: retrieved }, llm); state.phase = phases[7]; const name = new URL(state.repositoryUrl).pathname.split("/").filter(Boolean).join("/"); const revision = await this.repo.revision(workspace); state.phase = phases[8]; state.report = consolidate(state.analysisId, { url: state.repositoryUrl, name, ...revision }, profile, findings); state.status = "COMPLETED"; await this.persistState(state); } catch (error) { state.status = "FAILED"; state.error = errorMessage(error); await this.persistState(state); } finally { if (workspace) await this.repo.cleanup(state.analysisId); } }
  private async persistState(state: AnalysisState): Promise<void> { const dir = join(process.cwd(), "data", "analyses"); await mkdir(dir, { recursive: true }); await writeFile(join(dir, `${state.analysisId}.json`), JSON.stringify(state, null, 2)); }
  private async persistEvidence(id: string, evidence: EvidenceChunk[]): Promise<void> { const dir = join(process.cwd(), "data", "evidence"); await mkdir(dir, { recursive: true }); await writeFile(join(dir, `${id}.json`), JSON.stringify(evidence, null, 2)); }
  async restore(id: string): Promise<AnalysisState | undefined> { if (!isAnalysisId(id)) return undefined; if (this.states.has(id)) return this.states.get(id); try { const state = JSON.parse(await readFile(join(process.cwd(), "data", "analyses", `${id}.json`), "utf8")) as AnalysisState; this.states.set(id, state); const evidence = JSON.parse(await readFile(join(process.cwd(), "data", "evidence", `${id}.json`), "utf8")) as EvidenceChunk[]; this.evidence.set(id, evidence); return state; } catch { return undefined; } }
}
function isAnalysisId(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function errorMessage(error: unknown): string { const message = error instanceof Error ? error.message : "El análisis falló."; if (/not found|does not exist|Repository not found|could not read/i.test(message)) return "No se encontró el repositorio o no es público."; if (/timed out|timeout|ETIMEDOUT/i.test(message)) return "El clonado agotó el tiempo límite."; return message; }
