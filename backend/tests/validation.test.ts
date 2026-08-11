import test from "node:test";
import assert from "node:assert/strict";
import { detectArchitectureRequestMode } from "../src/models/ArchitectureRequestMode.ts";
import { buildValidationPrompt, validateDomain } from "../src/agents/shared/ValidationEngine.ts";
import type { RetrievedGuideline } from "../src/agents/shared/RetrievedGuideline.ts";
import type { ValidationPriority, AgentValidationResponse } from "../src/agents/shared/AgentValidationResponse.ts";
import type { IAgent } from "../src/agents/shared/IAgent.ts";
import type { AgentResponse } from "../src/agents/shared/AgentResponse.ts";
import type { ILLMProvider } from "../src/llm/ILLMProvider.ts";
import { OrchestratorAgent } from "../src/agents/orchestrator/OrchestratorAgent.ts";
import { CloudRetriever } from "../src/agents/cloud/rag/CloudRetriever.ts";
import { IntegrationRetriever } from "../src/agents/integration/rag/IntegrationRetriever.ts";
import { InfrastructureRetriever } from "../src/agents/infrastructure/rag/InfrastructureRetriever.ts";
import { architectureFixture } from "./fixtures.ts";
import { AgentRouter } from "../src/agents/orchestrator/AgentRouter.ts";

const rule = (ruleId: string, title: string, priority: ValidationPriority = "HIGH"): RetrievedGuideline => ({ ruleId, title, priority, content: `RULE_ID: ${ruleId}\n${title}\nPrioridad\n${priority}`, document: `${ruleId.split("-")[0]}.pdf`, section: "test", matchedQueries: [] });

test("detecta VALIDATION con imagen y conserva DESIGN sin imagen", () => {
  assert.equal(detectArchitectureRequestMode(true, "diseña"), "VALIDATION");
  assert.equal(detectArchitectureRequestMode(false, "¿Cómo diseñarías una plataforma bancaria?"), "DESIGN");
  assert.equal(detectArchitectureRequestMode(false, "audita esta arquitectura"), "VALIDATION");
});

test("el prompt separa pregunta, evidencia visual, reglas e instrucciones críticas", () => {
  const prompt = buildValidationPrompt({ requestId: "t", question: "¿Cumple?", visualEvidence: architectureFixture() }, [rule("CLOUD-HA-001", "Redundancia")]);
  for (const block of ["<USER_QUESTION>", "<VISUAL_EVIDENCE>", "<RETRIEVED_GUIDELINES>", "<VALIDATION_INSTRUCTIONS>"]) assert.match(prompt, new RegExp(block));
  assert.match(prompt, /nunca demuestran que la arquitectura lo implemente/i);
});

test("1 replica contradice redundancia y no convierte la regla en evidencia", async () => {
  const response = await validateDomain("cloud", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => [rule("CLOUD-HA-001", "Redundancia", "CRITICAL")]);
  assert.equal(response.findings[0].status, "NON_COMPLIANT");
  assert.match(response.findings[0].visualEvidence.join(" "), /Order Service: 1 replica/);
  assert.doesNotMatch(response.findings[0].visualEvidence.join(" "), /múltiples réplicas/i);
});

test("cantidad de replicas ausente produce NOT_EVIDENT", async () => {
  const visual = architectureFixture(); visual.deployment.replicasObserved = []; visual.components.forEach((component) => { component.labels = []; });
  const response = await validateDomain("cloud", { requestId: "t", question: "cumple", visualEvidence: visual }, async () => [rule("CLOUD-HA-001", "Redundancia", "CRITICAL")]);
  assert.equal(response.findings[0].status, "NOT_EVIDENT");
});

test("HTTPS visible es COMPLIANT", async () => {
  const response = await validateDomain("integration", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => [rule("INT-SEC-001", "HTTPS", "CRITICAL")]);
  assert.equal(response.findings[0].status, "COMPLIANT");
});

test("base compartida visible es NON_COMPLIANT", async () => {
  const response = await validateDomain("integration", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => [rule("INT-DATA-001", "Base compartida", "CRITICAL")]);
  assert.equal(response.findings[0].status, "NON_COMPLIANT");
  assert.ok(response.findings[0].relatedComponents.includes("Order Service"));
  assert.ok(response.findings[0].relatedComponents.includes("Payment Service"));
});

test("DLQ, backups, CI/CD e idempotencia ausentes son NOT_EVIDENT", async () => {
  const rules = [rule("INT-IDEMP-001", "Idempotencia"), rule("INT-RETRY-001", "Reintentos"), rule("INFRA-BACKUP-001", "Backups"), rule("INFRA-CICD-001", "CI/CD")];
  const response = await validateDomain("infrastructure", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => rules);
  assert.ok(response.findings.every((finding) => finding.status === "NOT_EVIDENT"));
});

test("regla de API sin API es NOT_APPLICABLE", async () => {
  const visual = architectureFixture(); visual.components = visual.components.filter((component) => !/gateway|app/i.test(component.name)); visual.integration.apis = []; visual.cloud.gateways = []; visual.security.exposedComponents = []; visual.connections = []; visual.summary = "Batch job"; visual.visibleText = [];
  const response = await validateDomain("integration", { requestId: "t", question: "cumple", visualEvidence: visual }, async () => [rule("INT-API-001", "Versionado")]);
  assert.equal(response.findings[0].status, "NOT_APPLICABLE");
});

test("la recuperación real deduplica ruleId y mantiene aislamiento por dominio", async () => {
  const groups = await Promise.all([
    new CloudRetriever().retrieveMany(["réplicas alta disponibilidad", "réplicas alta disponibilidad"]),
    new IntegrationRetriever().retrieveMany(["Kafka base compartida", "Kafka base compartida"]),
    new InfrastructureRetriever().retrieveMany(["Kubernetes réplicas backup", "Kubernetes réplicas backup"]),
  ]);
  const prefixes = ["CLOUD-", "INT-", "INFRA-"];
  groups.forEach((rules, index) => {
    assert.equal(new Set(rules.map(({ ruleId }) => ruleId)).size, rules.length);
    assert.ok(rules.every(({ ruleId }) => ruleId.startsWith(prefixes[index])));
  });
});

test("Orchestrator analiza visión una vez, enruta tres dominios pertinentes de forma secuencial y conserva estados/ruleId", async () => {
  const visual = architectureFixture(); let visionCalls = 0; const received: unknown[] = []; let active = 0; let maxActive = 0;
  const llm: ILLMProvider = { generate: async () => "", healthCheck: async () => undefined, analyzeArchitectureImage: async () => { visionCalls++; return visual; } };
  const makeAgent = (name: "cloud" | "integration" | "infrastructure", findingStatus: "COMPLIANT" | "NON_COMPLIANT"): IAgent => ({
    answer: async (): Promise<AgentResponse> => ({ agent: name, response: "design", context: [], relevant: true, findings: [], recommendations: [], risks: [], ruleIds: [] }),
    validate: async (input): Promise<AgentValidationResponse> => {
      received.push(input.visualEvidence); active++; maxActive = Math.max(maxActive, active); await new Promise((resolve) => setTimeout(resolve, 15)); active--;
      return { agent: name, mode: "VALIDATION", summary: name, findings: [{ ruleId: `${name.toUpperCase()}-TEST-001`, ruleTitle: "Test", status: findingStatus, priority: "HIGH", relatedComponents: ["Order Service"], visualEvidence: ["Order Service: 1 replica"], guidelineEvidence: "regla", explanation: "explicación", risk: findingStatus === "NON_COMPLIANT" ? "riesgo" : null, recommendation: null, source: { document: `${name}.pdf`, page: null, section: null }, confidence: 0.9 }], unansweredQuestions: [], retrievedRuleIds: [`${name.toUpperCase()}-TEST-001`], hasSufficientDomainEvidence: true };
    },
  });
  const orchestrator = new OrchestratorAgent(llm, makeAgent("cloud", "NON_COMPLIANT"), makeAgent("integration", "COMPLIANT"), makeAgent("infrastructure", "COMPLIANT"));
  const result = await orchestrator.answer("¿Cumple?", [], ["diagram.png"], [], { type: "image/png", content: "abc" }, "req");
  assert.equal(visionCalls, 1); assert.equal(received.length, 3); assert.ok(received.every((item) => item === visual)); assert.equal(maxActive, 1);
  assert.match(result, /Estado general: NON_COMPLIANT/); assert.match(result, /CLOUD-TEST-001/); assert.doesNotMatch(result, /Propuesta de arquitectura integral/); assert.doesNotMatch(result, /[A-Z]+-INVENTED/);
});

test("router selecciona solo integración para api gateway", () => {
  const routing = new AgentRouter().route("api gateway");
  assert.deepEqual(routing.selected, ["integration"]);
  assert.equal(routing.domains.find(({ domain }) => domain === "infrastructure")?.selection, "NOT_SELECTED");
});

test("router selecciona dos dominios cuando la evidencia los justifica", () => {
  const routing = new AgentRouter().route("Diseña una API REST desplegada en Kubernetes");
  assert.deepEqual(routing.selected, ["integration", "infrastructure"]);
});

test("router selecciona tres dominios solo con señales explícitas de los tres", () => {
  const routing = new AgentRouter().route("Despliega una API REST en Kubernetes con alta disponibilidad multi-AZ en AWS");
  assert.deepEqual(routing.selected, ["cloud", "integration", "infrastructure"]);
});

test("api gateway no ejecuta agentes cloud ni infrastructure", async () => {
  const calls: string[] = [];
  const llm: ILLMProvider = { generate: async () => "", healthCheck: async () => undefined, analyzeArchitectureImage: async () => { throw new Error("no debe llamarse"); } };
  const makeAgent = (name: string, relevant: boolean): IAgent => ({
    answer: async (): Promise<AgentResponse> => {
      calls.push(name);
      return { agent: name, response: "", context: [], relevant, findings: relevant ? ["Gobierno de APIs"] : [], recommendations: relevant ? ["Define contratos y políticas en el API Gateway."] : [], risks: [], ruleIds: relevant ? ["INT-API-001"] : [] };
    },
    validate: async () => { throw new Error("no debe llamarse"); },
  });
  const result = await new OrchestratorAgent(llm, makeAgent("Cloud", false), makeAgent("Integration", true), makeAgent("Infrastructure", false)).answer("api gateway");
  assert.deepEqual(calls, ["Integration"]);
  assert.match(result, /Recomendación de Integración/);
  assert.doesNotMatch(result, /Kubernetes|contenedor/i);
});

test("consulta textual existente conserva modo DESIGN", async () => {
  const llm: ILLMProvider = { generate: async () => "", healthCheck: async () => undefined, analyzeArchitectureImage: async () => { throw new Error("no debe llamarse"); } };
  const agent: IAgent = { answer: async () => ({ agent: "Cloud", response: "", context: [], relevant: true, findings: ["hallazgo"], recommendations: ["recomendación"], risks: [], ruleIds: ["CLOUD-DOMAIN-001"] }), validate: async () => { throw new Error("no debe llamarse"); } };
  const result = await new OrchestratorAgent(llm, agent, agent, agent).answer("¿Cómo diseñarías una plataforma bancaria?");
  assert.match(result, /Propuesta de arquitectura integral/);
});

test("una sola zona produce NON_COMPLIANT", async () => {
  const response = await validateDomain("cloud", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => [rule("CLOUD-HA-002", "Multi-AZ", "CRITICAL")]);
  assert.equal(response.findings[0].status, "NON_COMPLIANT");
  assert.match(response.findings[0].visualEvidence.join(" "), /Availability Zone: 1 only/);
});

test("la misma regla distingue Catalog con dos réplicas de servicios con una", async () => {
  const response = await validateDomain("infrastructure", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => [rule("INFRA-K8S-001", "Réplicas", "CRITICAL")]);
  assert.ok(response.findings.some((finding) => finding.status === "NON_COMPLIANT" && finding.relatedComponents.includes("Order Service")));
  assert.ok(response.findings.some((finding) => finding.status === "COMPLIANT" && finding.relatedComponents.includes("Catalog Service")));
});

test("gateway, load balancer, red privada y observabilidad visibles son COMPLIANT", async () => {
  const rules = [rule("INT-GATEWAY-001", "Gateway"), rule("INFRA-EDGE-001", "Edge"), rule("INFRA-NET-002", "Red privada"), rule("INFRA-LOG-001", "Logs")];
  const response = await validateDomain("infrastructure", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => rules);
  assert.ok(response.findings.every((finding) => finding.status === "COMPLIANT"));
});

test("API Gateway sin versión visible produce NOT_EVIDENT", async () => {
  const response = await validateDomain("integration", { requestId: "t", question: "cumple", visualEvidence: architectureFixture() }, async () => [rule("INT-API-001", "Versionado", "HIGH")]);
  assert.equal(response.findings[0].status, "NOT_EVIDENT");
});

test("arquitecturas frágil y resiliente producen evaluaciones diferentes por evidencia", async () => {
  const fragile = architectureFixture();
  fragile.components = fragile.components.filter((component) => ["Web App", "Order Service", "Shared PostgreSQL Database"].includes(component.name));
  fragile.components.find((component) => component.name === "Order Service")!.labels = ["1 replica"];
  fragile.deployment.replicasObserved = [{ componentId: "order", quantity: 1 }]; fragile.deployment.availabilityZones = ["Availability Zone: 1 only"];
  fragile.cloud.loadBalancers = []; fragile.cloud.gateways = []; fragile.infrastructure.privateNetworks = []; fragile.infrastructure.monitoringComponents = []; fragile.visibleText = ["Availability Zone: 1 only"];
  const resilient = architectureFixture(); resilient.components.forEach((component) => { if (/Service/.test(component.name)) component.labels = ["3 replicas"]; }); resilient.deployment.replicasObserved = resilient.deployment.replicasObserved.map((item) => ({ ...item, quantity: 3 })); resilient.deployment.availabilityZones = ["AZ-a", "AZ-b"]; resilient.summary = "Two Availability Zones"; resilient.visibleText = resilient.visibleText.filter((item) => !/1 only/.test(item)).concat("AZ-a", "AZ-b");
  const rules = [rule("CLOUD-HA-001", "Redundancia", "CRITICAL"), rule("CLOUD-HA-002", "Multi-AZ", "CRITICAL"), rule("CLOUD-LB-001", "Load Balancer")];
  const [fragileResult, resilientResult] = await Promise.all([
    validateDomain("cloud", { requestId: "b", question: "cumple", visualEvidence: fragile }, async () => rules),
    validateDomain("cloud", { requestId: "c", question: "cumple", visualEvidence: resilient }, async () => rules),
  ]);
  assert.ok(fragileResult.findings.some((finding) => finding.status === "NON_COMPLIANT"));
  assert.ok(resilientResult.findings.some((finding) => finding.status === "COMPLIANT"));
  assert.notDeepEqual(fragileResult.findings.map(({ ruleId, status }) => ({ ruleId, status })), resilientResult.findings.map(({ ruleId, status }) => ({ ruleId, status })));
});
