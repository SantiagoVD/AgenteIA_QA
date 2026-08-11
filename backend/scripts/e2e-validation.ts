import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const fixtures = (process.env.E2E_FIXTURES ?? "architecture-a-reference.png,architecture-b-fragile.png,architecture-c-resilient.png").split(",").map((item) => item.trim()).filter(Boolean);
const endpoint = process.env.BACKEND_URL ?? "http://localhost:3001/api/chat";
const resultsDirectory = join(process.cwd(), "tests", "e2e-results");
const summaryPath = join(resultsDirectory, "summary.json");
await mkdir(resultsDirectory, { recursive: true });
const previous = await readFile(summaryPath, "utf8").then((value) => JSON.parse(value) as Array<Record<string, unknown>>).catch(() => []);
const summary: Array<Record<string, unknown>> = previous.filter((item) => !fixtures.includes(String(item.fixture)));

for (const fixture of fixtures) {
  const startedAt = Date.now();
  const binary = await readFile(join(process.cwd(), "tests", "fixtures", "images", fixture));
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(900_000),
    body: JSON.stringify({ message: "¿Esta arquitectura cumple con los lineamientos?", attachments: [{ name: fixture, type: "image/png", content: binary.toString("base64") }] }),
  });
  const payload = await response.json() as { response?: string; error?: string; requestId?: string };
  const text = payload.response ?? `ERROR ${response.status}: ${payload.error} (${payload.requestId ?? "sin traza"})`;
  await writeFile(join(resultsDirectory, `${basename(fixture, ".png")}.txt`), text, "utf8");
  const validationChecks = checks(text);
  summary.push({ fixture, status: response.status, durationMs: Date.now() - startedAt, responseLength: text.length, checks: validationChecks, passed: response.ok && expectedFor(fixture, validationChecks, text) });
  console.log(fixture, response.status, `${Math.round((Date.now() - startedAt) / 1000)}s`);
}

summary.sort((left, right) => String(left.fixture).localeCompare(String(right.fixture)));
await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify(summary, null, 2));

function checks(text: string) {
  return {
    noDesignTitle: !text.includes("Propuesta de arquitectura integral"),
    hasRuleIds: /\b(?:CLOUD|INT|INFRA)-[A-Z0-9-]+/.test(text),
    hasStatuses: /\b(?:COMPLIANT|NON_COMPLIANT|NOT_EVIDENT|NOT_APPLICABLE)\b/.test(text),
    orderService: /Order Service/i.test(text),
    paymentService: /Payment Service/i.test(text),
    singleAz: /Availability Zone: 1 only/i.test(text),
    sharedDatabase: /Shared PostgreSQL Database/i.test(text),
    noFalseMultipleReplicaClaim: !/arquitectura distribuye los componentes críticos en varias instancias/i.test(text),
  };
}

function expectedFor(fixture: string, result: ReturnType<typeof checks>, text: string): boolean {
  const common = result.noDesignTitle && result.hasRuleIds && result.hasStatuses && result.noFalseMultipleReplicaClaim;
  if (fixture.startsWith("architecture-a")) return common && result.orderService && result.paymentService && result.singleAz && result.sharedDatabase && /DLQ/i.test(text) && /NOT_EVIDENT/.test(text);
  if (fixture.startsWith("architecture-b")) return common && result.orderService && /NON_COMPLIANT/.test(text) && /1 replica/i.test(text);
  return common && result.orderService && result.paymentService && /COMPLIANT/.test(text) && /(?:AZ-a|AZ-b|Two Availability Zones)/i.test(text);
}
