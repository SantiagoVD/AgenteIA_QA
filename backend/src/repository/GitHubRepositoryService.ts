import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
const exec = promisify(execFile);
export function validateGitHubUrl(value: string): URL {
  let url: URL; try { url = new URL(value); } catch { throw new Error("La URL del repositorio no es válida."); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || (url.port && url.port !== "443") || url.username || url.password || url.search || url.hash) throw new Error("Solo se aceptan URLs HTTPS públicas de GitHub.");
  const parts = url.pathname.split("/").filter(Boolean); if (parts.length !== 2 || !/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+$/.test(parts[1])) throw new Error("La URL debe tener el formato https://github.com/usuario/repositorio.");
  return url;
}
export class GitHubRepositoryService {
  async clone(urlValue: string, analysisId: string): Promise<string> { const url = validateGitHubUrl(urlValue); const root = join(process.cwd(), "workspaces", analysisId); const target = join(root, "repository"); await mkdir(root, { recursive: true }); try { await exec("git", ["clone", "--depth", "1", "--no-tags", url.toString(), target], { timeout: 120000, maxBuffer: 1024 * 1024 }); return target; } catch (e) { await this.cleanup(analysisId); const msg = e instanceof Error ? e.message : "Error de git"; throw new Error(`No se pudo clonar el repositorio: ${msg}`); } }
  async cleanup(analysisId: string): Promise<void> { await rm(join(process.cwd(), "workspaces", analysisId), { recursive: true, force: true }); }
  async revision(root: string): Promise<{ branch?: string; commit?: string }> { try { const branch = (await exec("git", ["-C", root, "branch", "--show-current"], { timeout: 5000 })).stdout.trim(); const commit = (await exec("git", ["-C", root, "rev-parse", "HEAD"], { timeout: 5000 })).stdout.trim(); return { branch: branch || undefined, commit: commit || undefined }; } catch { return {}; } }
}
