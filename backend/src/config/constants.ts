import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
const logsDirectory = join(process.cwd(), "..", "logs");
export async function log(message: string, isError = false): Promise<void> { const line = `[${new Date().toISOString()}] ${message}\n`; console[isError ? "error" : "log"](line.trim()); try { await mkdir(logsDirectory, { recursive: true }); await appendFile(join(logsDirectory, isError ? "error.log" : "application.log"), line); } catch { /* logging must never stop an analysis */ } }
export async function logEvent(event: string, details: Record<string, unknown> = {}, isError = false): Promise<void> { await log(`${event} ${JSON.stringify(details)}`, isError); }
