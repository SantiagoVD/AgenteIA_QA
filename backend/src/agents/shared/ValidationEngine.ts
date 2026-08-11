import type { ArchitectureVisualAnalysis } from "../../models/ArchitectureVisualAnalysis.ts";
import type { AgentValidationInput, AgentValidationResponse, ValidationAgentName, ValidationFinding, ValidationStatus } from "./AgentValidationResponse.ts";
import { assertAgentValidationResponse } from "./AgentValidationResponse.ts";
import type { RetrievedGuideline } from "./RetrievedGuideline.ts";
import { constants, logEvent } from "../../config/constants.ts";

export type RetrieveValidationRules = (queries: string[]) => Promise<RetrievedGuideline[]>;

export async function validateDomain(agent: ValidationAgentName, input: AgentValidationInput, retrieve: RetrieveValidationRules): Promise<AgentValidationResponse> {
  const queries = buildValidationQueries(agent, input.visualEvidence);
  const rules = await retrieve(queries);
  if (constants.validationDebug) await logEvent("validation.rag.retrieved", { requestId: input.requestId, agent, queries: queries.map((query) => query.split(/\.\s*Elementos observados:/i)[0]), ruleIds: rules.map(({ ruleId, matchedQueries }) => ({ ruleId, matchedQueries })) });
  const findings = rules.flatMap((rule) => evaluateRuleFindings(rule, input.visualEvidence));
  const response: AgentValidationResponse = {
    agent,
    mode: "VALIDATION",
    summary: summarize(agent, findings),
    findings,
    unansweredQuestions: unanswered(findings),
    retrievedRuleIds: rules.map((rule) => rule.ruleId),
    hasSufficientDomainEvidence: findings.some((finding) => finding.status === "COMPLIANT" || finding.status === "NON_COMPLIANT"),
  };
  return assertAgentValidationResponse(response);
}

export function buildValidationPrompt(input: AgentValidationInput, rules: RetrievedGuideline[]): string {
  return `<USER_QUESTION>\n${input.question}\n</USER_QUESTION>\n\n<VISUAL_EVIDENCE>\n${JSON.stringify(input.visualEvidence)}\n</VISUAL_EVIDENCE>\n\n<RETRIEVED_GUIDELINES>\n${rules.map((rule) => `${rule.ruleId}: ${rule.content}`).join("\n\n")}\n</RETRIEVED_GUIDELINES>\n\n<VALIDATION_INSTRUCTIONS>\nLas reglas describen lo que debería existir; nunca demuestran que la arquitectura lo implemente. Evalúa solo reglas recuperadas. Usa COMPLIANT cuando exista evidencia visible, NON_COMPLIANT cuando la evidencia contradiga la regla, NOT_EVIDENT cuando no pueda comprobarse y NOT_APPLICABLE cuando no corresponda. No inventes reglas ni conviertas recomendaciones en evidencia.\n</VALIDATION_INSTRUCTIONS>`;
}

export function buildValidationQueries(agent: ValidationAgentName, visual: ArchitectureVisualAnalysis): string[] {
  const visible = visualText(visual);
  const domainQueries: Record<ValidationAgentName, string[]> = {
    cloud: [
      "servicios réplicas instancias escalamiento horizontal alta disponibilidad",
      "zonas de disponibilidad multi-AZ dominios de fallo",
      "load balancer distribución de tráfico",
      "Redis estado externo sesiones stateless",
      "Secret Manager secretos credenciales",
      "HTTPS TLS cifrado comunicaciones",
      "monitoring logging observabilidad",
    ],
    integration: [
      "API Gateway HTTPS APIs externas versionado contratos",
      "Kafka eventos topics OrderCreated comunicación asíncrona",
      "idempotencia reintentos DLQ procesamiento eventos",
      "shared PostgreSQL database base compartida microservicios",
      "trazabilidad correlation ID logging integración",
    ],
    infrastructure: [
      "Kubernetes réplicas workloads críticos probes limits",
      "Availability Zone punto único de falla alta disponibilidad",
      "load balancer gateway punto de entrada controlado",
      "private network segmentación componentes internos",
      "monitoring centralized logging métricas alertas",
      "backup disaster recovery PostgreSQL",
      "CI/CD pipeline automatizado",
    ],
  };
  return domainQueries[agent].map((query) => `${query}. Elementos observados: ${visible.slice(0, 900)}`);
}

function evaluateRule(rule: RetrievedGuideline, visual: ArchitectureVisualAnalysis): ValidationFinding {
  const evidence = inspectVisual(visual);
  let status: ValidationStatus = "NOT_EVIDENT";
  let visualEvidence: string[] = [];
  let explanation = "La imagen no contiene evidencia suficiente para confirmar ni contradecir esta regla.";

  const compliant = (items: string[], why: string) => { status = "COMPLIANT"; visualEvidence = items; explanation = why; };
  const nonCompliant = (items: string[], why: string) => { status = "NON_COMPLIANT"; visualEvidence = items; explanation = why; };
  const notApplicable = (why: string) => { status = "NOT_APPLICABLE"; explanation = why; };

  switch (rule.ruleId) {
    case "CLOUD-SCALE-001": case "CLOUD-HA-001": case "INFRA-K8S-001": {
      if (evidence.singleReplica.length) nonCompliant(evidence.singleReplica.map(({ name }) => `${name}: 1 replica`), "La imagen muestra explícitamente una sola réplica para workloads que requieren redundancia.");
      else if (evidence.replicated.length) compliant(evidence.replicated.map(({ name, quantity }) => `${name}: ${quantity} replicas`), "La imagen muestra múltiples réplicas para los workloads evaluados.");
      break;
    }
    case "CLOUD-HA-002": case "INFRA-HA-001": {
      if (evidence.singleAz) nonCompliant([evidence.singleAz], "La arquitectura está limitada explícitamente a una sola zona de disponibilidad, creando un dominio de fallo único.");
      else if (evidence.multipleAz.length >= 2) compliant([`Zonas visibles: ${evidence.multipleAz.join(", ")}`], "La arquitectura muestra distribución entre más de una zona.");
      else if (rule.ruleId === "INFRA-HA-001" && evidence.singleReplica.length) nonCompliant(evidence.singleReplica.map(({ name }) => `${name}: 1 replica`), "Se observan instancias únicas que constituyen puntos únicos de falla.");
      break;
    }
    case "CLOUD-LB-001": case "INFRA-EDGE-001":
      if (evidence.loadBalancer) compliant([evidence.loadBalancer], "Existe un Load Balancer visible como punto de distribución o entrada.");
      break;
    case "CLOUD-STATE-002":
      if (evidence.redis) compliant([evidence.redis], "La imagen muestra Redis como componente externo para estado o sesiones.");
      break;
    case "CLOUD-SECRET-001":
      if (evidence.secretManager) compliant([evidence.secretManager], "La imagen muestra un gestor externo de secretos.");
      break;
    case "CLOUD-SEC-001": case "INT-SEC-001":
      if (evidence.https) compliant([evidence.https], "La conexión externa visible hacia el punto de entrada utiliza HTTPS.");
      break;
    case "CLOUD-OBS-001": case "INFRA-LOG-001": case "INFRA-MON-001":
      if (evidence.monitoring) compliant([evidence.monitoring], "La imagen muestra monitoreo o logging centralizado.");
      break;
    case "INT-GATEWAY-001":
      if (evidence.gateway) compliant([evidence.gateway], "La arquitectura muestra API Gateway como punto de entrada controlado.");
      else if (!evidence.hasApi) notApplicable("No se observa una API externa a la cual aplicar la regla.");
      break;
    case "INT-API-001": case "INT-CONTRACT-001": case "INT-REST-001": case "INT-REST-002":
      if (!evidence.hasApi) notApplicable("No se observa una API en el escenario.");
      else if (evidence.apiVersion) compliant([evidence.apiVersion], "La imagen contiene una versión de API visible.");
      break;
    case "INT-KAFKA-001": case "INT-ASYNC-001":
      if (evidence.kafka) compliant([evidence.kafka, ...evidence.events], "Kafka y el flujo de eventos son visibles en la arquitectura.");
      else if (!evidence.hasMessaging) notApplicable("No se observa mensajería o procesamiento asíncrono.");
      break;
    case "INT-EVENT-001":
      if (evidence.events.length) compliant(evidence.events, "Se observa al menos un evento de negocio nombrado.");
      else if (!evidence.hasMessaging) notApplicable("No se observa arquitectura orientada a eventos.");
      break;
    case "INT-RMQ-001":
      if (!evidence.rabbitMq) notApplicable("La regla es específica de RabbitMQ y la imagen no muestra RabbitMQ.");
      break;
    case "INT-DATA-001":
      if (evidence.sharedDatabase.length >= 2) nonCompliant([`${evidence.sharedDatabase.join(" y ")} conectan a Shared PostgreSQL Database`], "Servicios de dominios diferentes comparten directamente la misma base de datos.");
      break;
    case "INFRA-NET-002": case "INFRA-NET-001":
      if (evidence.privateNetwork) compliant([evidence.privateNetwork], "Los componentes internos aparecen dentro de una red privada.");
      break;
    case "INT-IDEMP-001": explanation = "No se observa evidencia de idempotencia o deduplicación; su ausencia visual no demuestra incumplimiento."; break;
    case "INT-RETRY-001": explanation = evidence.dlq ? "Se observa DLQ, pero no hay evidencia suficiente de reintentos o backoff." : "No se observan reintentos, backoff ni DLQ; su ausencia visual no demuestra incumplimiento."; break;
    case "INFRA-BACKUP-001": if (evidence.backups) compliant([evidence.backups], "La imagen muestra backups explícitamente."); else explanation = "No se observan backups, snapshots o restauración; su ausencia visual no demuestra incumplimiento."; break;
    case "INFRA-DR-001": if (evidence.disasterRecovery) compliant([evidence.disasterRecovery], "La imagen muestra Disaster Recovery explícitamente."); else explanation = "No se observa Disaster Recovery, región secundaria, RTO o RPO; su ausencia visual no demuestra incumplimiento."; break;
    case "INFRA-CICD-001": if (evidence.cicd) compliant([evidence.cicd], "La imagen muestra CI/CD explícitamente."); else explanation = "No se observa pipeline de CI/CD; su ausencia visual no demuestra incumplimiento."; break;
    case "INFRA-K8S-002": if (evidence.probes.length) compliant(evidence.probes, "La imagen muestra probes de salud explícitamente."); else explanation = "No se observan readiness, liveness o startup probes; su ausencia visual no demuestra incumplimiento."; break;
    case "INFRA-K8S-003": explanation = "No se observan requests o limits de recursos; su ausencia visual no demuestra incumplimiento."; break;
  }

  const finalStatus = status as ValidationStatus;
  return {
    ruleId: rule.ruleId,
    ruleTitle: rule.title,
    status: finalStatus,
    priority: rule.priority,
    relatedComponents: relatedComponents(visualEvidence, evidence.components),
    visualEvidence,
    guidelineEvidence: guidelineExcerpt(rule.content),
    explanation,
    risk: finalStatus === "NON_COMPLIANT" ? riskFor(rule.ruleId) : null,
    recommendation: finalStatus === "NON_COMPLIANT" ? recommendationFor(rule.ruleId) : null,
    source: { document: rule.document, page: null, section: rule.section },
    confidence: finalStatus === "COMPLIANT" || finalStatus === "NON_COMPLIANT" ? 0.9 : finalStatus === "NOT_APPLICABLE" ? 0.8 : 0.65,
  };
}

function evaluateRuleFindings(rule: RetrievedGuideline, visual: ArchitectureVisualAnalysis): ValidationFinding[] {
  const primary = evaluateRule(rule, visual);
  if (!["CLOUD-SCALE-001", "CLOUD-HA-001", "INFRA-K8S-001"].includes(rule.ruleId)) return [primary];
  const evidence = inspectVisual(visual);
  if (!evidence.singleReplica.length || !evidence.replicated.length) return [primary];
  const visualEvidence = evidence.replicated.map(({ name, quantity }) => `${name}: ${quantity} replicas`);
  return [primary, {
    ...primary,
    status: "COMPLIANT",
    relatedComponents: evidence.replicated.map(({ name }) => name),
    visualEvidence,
    explanation: "Estos componentes muestran explícitamente múltiples réplicas y cumplen la regla en su alcance.",
    risk: null,
    recommendation: null,
    confidence: 0.9,
  }];
}

function inspectVisual(visual: ArchitectureVisualAnalysis) {
  const text = visualText(visual);
  const components = visual.components.map((component) => component.name);
  const replicas = [...visual.deployment.replicasObserved];
  for (const component of visual.components) {
    const match = `${component.name} ${component.labels.join(" ")}`.match(/(?:\(|\b)(\d+)\s*replicas?\b/i);
    if (match && !replicas.some((item) => item.componentId === component.id || item.componentId === component.name)) replicas.push({ componentId: component.name, quantity: Number(match[1]) });
  }
  const named = (id: string) => visual.components.find((component) => component.id === id)?.name ?? id;
  const singleReplica = replicas.filter((item) => item.quantity === 1).map((item) => ({ name: named(item.componentId), quantity: 1 }));
  const replicated = replicas.filter((item): item is { componentId: string; quantity: number } => typeof item.quantity === "number" && item.quantity >= 2).map((item) => ({ name: named(item.componentId), quantity: item.quantity }));
  const sharedDbConnections = visual.connections.filter((connection) => /postgres|shared.*database/i.test(`${connection.to} ${connection.from}`));
  const sharedDatabase = [...new Set(sharedDbConnections.map((connection) => /postgres|database/i.test(connection.to) ? named(connection.from) : named(connection.to)).filter((name) => /service/i.test(name)))];
  const componentNamed = (pattern: RegExp) => visual.components.find(({ name }) => pattern.test(name))?.name ?? null;
  const structuredSharedDatabase = visual.integration.sharedDatabases.length > 0 || Boolean(componentNamed(/shared.*(?:postgres|database)/i));
  return {
    text, components, singleReplica, replicated,
    singleAz: visual.deployment.availabilityZones.find((zone) => /1\s*only|single|una\s*sola/i.test(zone)) ?? null,
    multipleAz: visual.deployment.availabilityZones,
    loadBalancer: visual.cloud.loadBalancers[0] ?? componentNamed(/load balancer/i),
    gateway: visual.cloud.gateways[0] ?? componentNamed(/api gateway/i),
    redis: visual.cloud.statefulEvidence.find((item) => /redis/i.test(item)) ?? componentNamed(/redis/i),
    secretManager: visual.security.secretManagers[0] ?? componentNamed(/secret manager|vault/i),
    monitoring: visual.infrastructure.monitoringComponents[0] ?? visual.infrastructure.loggingComponents[0] ?? componentNamed(/monitoring|centralized logging/i),
    https: visual.security.encryptionEvidence.find((item) => /https/i.test(item)) ?? visual.connections.find(({ protocol }) => /https/i.test(protocol ?? ""))?.protocol ?? null,
    kafka: visual.integration.brokers.find((item) => /kafka/i.test(item)) ?? componentNamed(/kafka/i),
    rabbitMq: visual.integration.brokers.some((item) => /rabbitmq/i.test(item)) || Boolean(componentNamed(/rabbitmq/i)),
    events: [...new Set(visual.integration.events)],
    hasApi: visual.integration.apis.length > 0 || Boolean(componentNamed(/api gateway|\bapi\b/i)), apiVersion: visual.integration.apiVersions[0] ?? null,
    hasMessaging: visual.integration.brokers.length > 0 || visual.integration.events.length > 0,
    privateNetwork: visual.infrastructure.privateNetworks[0] ?? null,
    sharedDatabase: sharedDatabase.length ? sharedDatabase : structuredSharedDatabase ? components.filter((name) => /order service|payment service/i.test(name)) : [],
    backups: visual.infrastructure.backupComponents[0] ?? null,
    disasterRecovery: visual.infrastructure.disasterRecoveryComponents[0] ?? null,
    cicd: visual.visibleText.find((item) => /CI\s*\/\s*CD/i.test(item)) ?? null,
    probes: visual.visibleText.filter((item) => /readiness|liveness|startup probe/i.test(item)),
    dlq: visual.integration.queues.find((item) => /DLQ|dead letter/i.test(item)) ?? null,
  };
}

function visualText(visual: ArchitectureVisualAnalysis): string { return JSON.stringify(visual).replace(/[{}\[\]"]/g, " ").replace(/\s+/g, " "); }
function firstVisible(text: string, candidates: string[]): string | null { return candidates.find((candidate) => text.toLowerCase().includes(candidate.toLowerCase())) ?? null; }
function relatedComponents(evidence: string[], components: string[]): string[] { const joined = evidence.join(" ").toLowerCase(); return components.filter((name) => joined.includes(name.toLowerCase())); }
function guidelineExcerpt(content: string): string { return content.replace(/RULE_ID:[^\n]*\n?/, "").replace(/\s+/g, " ").trim().slice(0, 700); }
function summarize(agent: string, findings: ValidationFinding[]): string { const count = (status: ValidationStatus) => findings.filter((item) => item.status === status).length; return `${agent}: ${count("COMPLIANT")} cumplimientos, ${count("NON_COMPLIANT")} incumplimientos, ${count("NOT_EVIDENT")} sin evidencia y ${count("NOT_APPLICABLE")} no aplicables.`; }
function unanswered(findings: ValidationFinding[]): string[] { return findings.filter((item) => item.status === "NOT_EVIDENT").slice(0, 6).map((item) => `¿Existe evidencia adicional para validar ${item.ruleTitle} (${item.ruleId})?`); }
function riskFor(ruleId: string): string { return /HA|SCALE|K8S-001/.test(ruleId) ? "Un fallo de instancia o zona puede interrumpir el servicio." : ruleId === "INT-DATA-001" ? "La base compartida incrementa el acoplamiento y el impacto de cambios o fallos." : "La evidencia visible contradice un lineamiento aplicable."; }
function recommendationFor(ruleId: string): string { return /HA-002/.test(ruleId) ? "Distribuir los workloads entre al menos dos zonas de disponibilidad." : /HA|SCALE|K8S-001/.test(ruleId) ? "Aumentar las réplicas de cada servicio afectado y eliminar instancias únicas." : ruleId === "INT-DATA-001" ? "Separar el ownership de datos por dominio y evitar acceso directo compartido." : "Corregir el componente señalado conforme a la regla citada."; }
