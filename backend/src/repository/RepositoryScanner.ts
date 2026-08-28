import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
const ignored = new Set([".git","node_modules","vendor","dist","build","bin","obj","coverage",".next",".cache","tmp","logs"]);
const allowed = /\.(ts|tsx|js|jsx|cs|java|py|go|rb|php|json|ya?ml|xml|toml|properties|md|txt|csproj|lock|tf|hcl|gradle)$/i;
const special = /^(Dockerfile|docker-compose.*|package\.json|requirements\.txt|pyproject\.toml|pom\.xml|build\.gradle|\.env\.example|\.gitignore|README(?:\..*)?|LICENSE(?:\..*)?)$/i;
export interface ScannedFile { relativePath: string; content: string; lines: number; category: string; }
export class RepositoryScanner {
  private totalBytes = 0;
  async scan(root: string): Promise<ScannedFile[]> { this.totalBytes = 0; const files: ScannedFile[] = []; await this.walk(root, root, files); return files; }
  private async walk(root: string, dir: string, out: ScannedFile[]): Promise<void> { for (const entry of await readdir(dir, { withFileTypes: true })) { if (entry.isDirectory() && ignored.has(entry.name)) continue; const full = join(dir, entry.name); if (entry.isDirectory()) await this.walk(root, full, out); else { const rel = relative(root, full).replaceAll("\\", "/"); if (!(allowed.test(entry.name) || special.test(entry.name)) || rel === ".env" || entry.name.endsWith(".map")) continue; if (out.length >= 2000) throw new Error("El repositorio contiene demasiados archivos analizables (límite: 2000)."); try { const content = await readFile(full, "utf8"); const bytes = Buffer.byteLength(content); this.totalBytes += bytes; if (this.totalBytes > 50 * 1024 * 1024) throw new Error("El repositorio supera el límite de 50 MB de contenido analizable."); if (bytes > 512 * 1024 || /[\u0000-\u0008\u000E-\u001F]/.test(content)) continue; out.push({ relativePath: rel, content, lines: content.split(/\r?\n/).length, category: this.category(rel) }); } catch (error) { if (error instanceof Error && /límite/.test(error.message)) throw error; /* unreadable files are intentionally ignored */ } } } }
  private category(path: string): string { if (/test|spec|__tests__/i.test(path)) return "test"; if (/\.github\/workflows|Docker|ya?ml|json|toml|\.env/i.test(path)) return "config"; if (/\.md$/i.test(path)) return "documentation"; return "source"; }
}
