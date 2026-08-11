import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const logsDirectory = join(process.cwd(), "..", "logs");

export async function log(message: string, isError = false): Promise<void> {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  console[isError ? "error" : "log"](line.trim());
  try {
    await mkdir(logsDirectory, { recursive: true });
    await appendFile(join(logsDirectory, "application.log"), line);
    if (isError) await appendFile(join(logsDirectory, "error.log"), line);
  } catch (error) { console.error("No se pudo escribir el log", error); }
}

export async function logEvent(event: string, details: Record<string, unknown> = {}, isError = false): Promise<void> {
  await log(`${event} ${JSON.stringify(details, errorReplacer)}`, isError);
}

function errorReplacer(_key: string, value: unknown): unknown {
  if (!(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack,
    cause: value.cause,
  };
}

export const constants = {
  chunkSize: 700,
  chunkOverlap: 120,
  topK: 5,
  validationTopKPerQuery: Number(process.env.VALIDATION_TOP_K_PER_QUERY ?? 5),
  validationRuleLimit: Number(process.env.VALIDATION_RULE_LIMIT ?? 20),
  validationDebug: process.env.ARCHITECTURE_VALIDATION_DEBUG === "true",
};
