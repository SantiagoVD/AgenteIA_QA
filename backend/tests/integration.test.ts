import test from "node:test";
import assert from "node:assert/strict";
import type { ILLMProvider } from "../src/llm/ILLMProvider.ts";
import { OrchestratorAgent } from "../src/agents/orchestrator/OrchestratorAgent.ts";
import { assertAgentValidationResponse } from "../src/agents/shared/AgentValidationResponse.ts";
import { architectureFixture } from "./fixtures.ts";
import { readFile } from "node:fs/promises";
import { ArchitectureVisionAnalyzer, shutdownVisionOcr } from "../src/vision/ArchitectureVisionAnalyzer.ts";

test("integración: DESIGN textual conserva respuesta de recomendación", async () => {
  const llm = fakeProvider();
  const result = await new OrchestratorAgent(llm).answer("¿Cómo diseñarías una plataforma bancaria?");
  assert.match(result, /Propuesta de arquitectura integral/);
  assert.match(result, /Fuentes RAG:/);
});

test("integración: opción de lineamientos para API Gateway prioriza reglas específicas", async () => {
  const history = [
    { sender: "user" as const, text: "api gateway" },
    { sender: "agent" as const, text: "1. Entender qué es API Gateway.\n2. Conocer los lineamientos recomendados.\n3. Diseñar API Gateway.\n4. Validar una arquitectura." },
  ];
  const result = await new OrchestratorAgent(fakeProvider()).answer("2", [], [], history);
  assert.match(result, /Entendido: quieres conocer los lineamientos/i);
  const ids = [...result.matchAll(/\bINT-[A-Z0-9-]+/g)].map(([id]) => id);
  assert.ok(ids.length > 0);
  assert.ok(ids.every((id) => /^INT-(?:GATEWAY|API|REST|SEC|TRACE|AUTH|RATE)-/.test(id)), ids.join(", "));
  assert.doesNotMatch(result, /INT-(?:DATA|ASYNC|POINT|SYNC)-/);
});

test("integración: VALIDATION consolida los tres RAG, fuentes y evidencia", async () => {
  const visual = architectureFixture();
  const result = await new OrchestratorAgent(fakeProvider(visual)).answer("¿Esta arquitectura cumple con los lineamientos?", [], ["architecture.png"], [], { type: "image/png", content: "fixture" }, "integration");
  assert.match(result, /Estado general: NON_COMPLIANT/);
  for (const value of ["Order Service", "Payment Service", "Availability Zone: 1 only", "Shared PostgreSQL Database", "NOT_EVIDENT", "CLOUD-", "INT-", "INFRA-"]) assert.match(result, new RegExp(value));
  assert.doesNotMatch(result, /Propuesta de arquitectura integral/);
  assert.doesNotMatch(result, /arquitectura distribuye los componentes críticos en varias instancias/i);
});

test("integración: JSON interno inválido es rechazado", () => {
  assert.throws(() => assertAgentValidationResponse({ mode: "VALIDATION", findings: [{ status: "UNKNOWN" }] } as never), /inválida|inválido/i);
});

test("integración: fallo del analizador visual se propaga como error tipado", async () => {
  const unavailable: ILLMProvider = { generate: async () => "", healthCheck: async () => { throw new Error("Ollama no disponible"); }, analyzeArchitectureImage: async () => { throw new Error("Ollama no disponible"); } };
  await assert.rejects(() => new OrchestratorAgent(unavailable).answer("valida", [], ["x.png"], [], { type: "image/png", content: "x" }), /Ollama no disponible/);
});

function fakeProvider(visual = architectureFixture()): ILLMProvider {
  return { generate: async () => "unused", healthCheck: async () => undefined, analyzeArchitectureImage: async () => visual };
}

test("integración: OCR local completa el JSON visual sin inventar reglas", async () => {
  const image = await readFile(new URL("./fixtures/images/architecture-a-reference.png", import.meta.url));
  const analyzer = new ArchitectureVisionAnalyzer({ analyzeImage: async () => "<think>Diagrama visible.</think>" });
  const visual = await analyzer.analyze(image.toString("base64"), "image/png");
  const names = visual.components.map(({ name }) => name);
  for (const name of ["Web App", "Mobile App", "API Gateway", "Order Service", "Payment Service", "Catalog Service", "Shared PostgreSQL Database"]) assert.ok(names.includes(name), name);
  assert.deepEqual(visual.deployment.replicasObserved.map(({ quantity }) => quantity), [1, 1, 2, 1, 1]);
  assert.ok(visual.deployment.availabilityZones.includes("Availability Zone: 1 only"));
  await shutdownVisionOcr();
});
