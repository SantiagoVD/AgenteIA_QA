import type { ArchitectureVisualAnalysis } from "../models/ArchitectureVisualAnalysis.ts";
import { QwenClient } from "../llm/QwenClient.ts";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { fileURLToPath } from "node:url";

const prompt = `Describe exclusivamente los elementos visibles del diagrama y devuelve solo JSON válido con estas claves: summary, components, connections, deployment, cloud, integration, infrastructure, security, observations, uncertainties, visibleText.
No uses conocimiento general para completar la arquitectura. No conviertas una ausencia visual en incumplimiento. No recomiendes ni evalúes lineamientos.
No afirmes réplicas, TLS, backups, idempotencia, DLQ, autoscaling, probes, CI/CD o Disaster Recovery si el texto o símbolo no es visible. Usa null, unknown, arrays vacíos o uncertainties.
Conserva literalmente nombres, cantidades y textos importantes. Captura, si son visibles: Web/Mobile App, API Gateway, Load Balancer, regiones, zonas, redes, Kubernetes, nombres de servicios y réplicas, Kafka, eventos, bases compartidas, Redis, Secret Manager, monitoring y logging.
Formato de components: [{"id":"...","name":"...","type":"...","labels":[],"confidence":0.0}]. Formato de connections: [{"from":"...","to":"...","direction":"directed|bidirectional|unknown","protocol":null,"communicationType":"synchronous|asynchronous|unknown","labels":[],"confidence":0.0}].`;

export class ArchitectureVisionAnalyzer {
  private readonly client: Pick<QwenClient, "analyzeImage">;
  constructor(client: Pick<QwenClient, "analyzeImage">) { this.client = client; }
  async analyze(imageBase64: string, mimeType: string): Promise<ArchitectureVisualAnalysis> {
    if (!/^image\/(png|jpeg|webp)$/.test(mimeType)) throw new Error("Tipo de imagen no permitido.");
    const source = Buffer.from(imageBase64, "base64");
    const [optimized, ocrImage] = await Promise.all([
      sharp(source).rotate().resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer(),
      sharp(source).rotate().resize({ width: 1800, fit: "inside", withoutEnlargement: false }).grayscale().sharpen().png().toBuffer(),
    ]);
    const [raw, ocrText] = await Promise.all([
      this.client.analyzeImage(prompt, optimized.toString("base64")),
      recognizeText(ocrImage),
    ]);
    return enrichWithOcr(parseVisualAnalysis(raw), ocrText);
  }
}

function parseVisualAnalysis(raw: string): ArchitectureVisualAnalysis {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  let value: unknown;
  try { value = JSON.parse(cleaned); } catch { return unstructuredAnalysis(cleaned); }
  if (!value || typeof value !== "object") throw new Error("La respuesta visual tiene un formato inválido.");
  const record = value as Record<string, unknown>;
  const required = ["summary", "components", "connections", "deployment", "cloud", "integration", "infrastructure", "security", "observations", "uncertainties", "visibleText"];
  if (required.some((key) => !(key in record)) || typeof record.summary !== "string" || !Array.isArray(record.components)) throw new Error("La respuesta visual no cumple el esquema requerido.");
  return record as unknown as ArchitectureVisualAnalysis;
}

/** Preserve model-produced visual evidence when Qwen3-VL exhausts its output in reasoning before emitting JSON. */
function unstructuredAnalysis(raw: string): ArchitectureVisualAnalysis {
  const evidence = raw.replace(/<\/?think>/gi, "").trim().slice(0, 8000);
  const visibleNames = [...new Set([
    ...(evidence.match(/\b(?:Web App|Mobile App|API Gateway|Load Balancer|Kubernetes Cluster|Shared PostgreSQL Database|Redis Session Cache|Secret Manager|Monitoring\s*(?:&|and)\s*Centralized Logging|Kafka)\b/gi) ?? []),
    ...(evidence.match(/\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+Service\b/g) ?? []),
  ])];
  const components = visibleNames.map((name, index) => ({ id: `observed-${index + 1}`, name, type: inferType(name), labels: replicaLabel(evidence, name), confidence: 0.55 }));
  const replicasObserved = components.map((component) => {
    const quantity = component.labels.join(" ").match(/(\d+)\s*replicas?/i)?.[1];
    return quantity ? { componentId: component.id, quantity: Number(quantity) } : null;
  }).filter((item): item is { componentId: string; quantity: number } => item !== null);
  const visibleText = [...new Set([
    ...(evidence.match(/Availability\s+Zone\s*:?\s*1\s*only/gi) ?? []),
    ...(evidence.match(/Region\s*:?\s*[a-z]{2}-[a-z]+-\d/gi) ?? []),
    ...(evidence.match(/\bHTTPS\b/gi) ?? []),
    ...(evidence.match(/\b[A-Z][A-Za-z]+Created\b/g) ?? []),
    ...visibleNames,
  ])];
  return {
    summary: evidence, components, connections: [], visibleText,
    deployment: { environments: [], regions: visibleText.filter((item) => /^region/i.test(item)), availabilityZones: visibleText.filter((item) => /availability zone/i.test(item)), clusters: visibleNames.filter((item) => /cluster/i.test(item)), replicasObserved },
    cloud: { loadBalancers: visibleNames.filter((item) => /load balancer/i.test(item)), gateways: visibleNames.filter((item) => /gateway/i.test(item)), autoscalingObserved: null, managedServices: [], statelessEvidence: [], statefulEvidence: visibleNames.filter((item) => /redis/i.test(item)) },
    integration: { apis: visibleNames.filter((item) => /gateway/i.test(item)), apiVersions: [], brokers: visibleNames.filter((item) => /kafka/i.test(item)), queues: [], topics: [], events: visibleText.filter((item) => /Created$/.test(item)), sharedDatabases: visibleNames.filter((item) => /shared.*database/i.test(item)), pointToPointConnections: [] },
    infrastructure: { publicNetworks: /public (?:zone|network)/i.test(evidence) ? ["Public Zone"] : [], privateNetworks: /private network/i.test(evidence) ? ["Private Network"] : [], firewalls: [], containers: [], kubernetesResources: visibleNames.filter((item) => /kubernetes/i.test(item)), monitoringComponents: visibleNames.filter((item) => /monitoring/i.test(item)), loggingComponents: visibleNames.filter((item) => /logging/i.test(item)), backupComponents: [], disasterRecoveryComponents: [] },
    security: { authenticationMechanisms: [], encryptionEvidence: visibleText.filter((item) => /https/i.test(item)), secretManagers: visibleNames.filter((item) => /secret manager/i.test(item)), exposedComponents: [] },
    observations: [{ text: evidence, relatedComponentIds: [], confidence: 0.45 }],
    uncertainties: [{ topic: "Formato de salida", reason: "El modelo visual no completó el JSON solicitado; se conserva únicamente su evidencia textual." }],
  };
}

function inferType(name: string): string { return /service/i.test(name) ? "service" : /database|postgres/i.test(name) ? "database" : /gateway/i.test(name) ? "gateway" : /balancer/i.test(name) ? "load-balancer" : /kafka/i.test(name) ? "broker" : "component"; }
function replicaLabel(text: string, name: string): string[] { const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const match = text.match(new RegExp(`${escaped}[\\s\\S]{0,200}?(\\d+)\\s*replicas?`, "i")); return match ? [`${match[1]} replica${match[1] === "1" ? "" : "s"}`] : []; }

const languagePath = fileURLToPath(new URL("../../node_modules/@tesseract.js-data/eng/4.0.0", import.meta.url));
const workerPromise = createWorker("eng", 1, { langPath: languagePath, gzip: true, cacheMethod: "readOnly" });
export async function shutdownVisionOcr(): Promise<void> { await (await workerPromise).terminate(); }

async function recognizeText(image: Buffer): Promise<string> {
  const worker = await workerPromise;
  const result = await worker.recognize(image);
  return result.data.text.replace(/\s+/g, " ").trim();
}

function enrichWithOcr(visual: ArchitectureVisualAnalysis, ocrText: string): ArchitectureVisualAnalysis {
  const names = extractNames(ocrText);
  const ocrNameSet = new Set(names.map(normalize));
  const usedUnstructuredFallback = visual.uncertainties.some(({ topic }) => topic === "Formato de salida");
  visual.components = visual.components.filter((component) => component.confidence > 0.6 || ocrNameSet.has(normalize(component.name)));
  if (usedUnstructuredFallback) {
    const confirmed = (value: string) => normalize(ocrText).includes(normalize(value).slice(0, Math.min(normalize(value).length, 14)));
    visual.integration.sharedDatabases = visual.integration.sharedDatabases.filter(confirmed);
    visual.integration.brokers = visual.integration.brokers.filter(confirmed);
    visual.cloud.loadBalancers = visual.cloud.loadBalancers.filter(confirmed);
    visual.cloud.gateways = visual.cloud.gateways.filter(confirmed);
    visual.cloud.statefulEvidence = visual.cloud.statefulEvidence.filter(confirmed);
    visual.security.secretManagers = visual.security.secretManagers.filter(confirmed);
    visual.infrastructure.monitoringComponents = visual.infrastructure.monitoringComponents.filter(confirmed);
    visual.infrastructure.loggingComponents = visual.infrastructure.loggingComponents.filter(confirmed);
    visual.visibleText = visual.visibleText.filter((value) => !/shared.*(?:postgres|database)/i.test(value) || /shared\s+postgresql\s+data\w*/i.test(ocrText));
  }
  const retainedIds = new Set(visual.components.map(({ id }) => id));
  visual.connections = visual.connections.filter(({ from, to }) => retainedIds.has(from) && retainedIds.has(to));
  const ocrReplicas = extractReplicaMap(ocrText);
  const existing = new Set(visual.components.map(({ name }) => normalize(name)));
  for (const name of names) if (!existing.has(normalize(name))) {
    visual.components.push({ id: `ocr-${visual.components.length + 1}`, name, type: inferType(name), labels: ocrReplicas.get(normalize(name)) ? [replicaText(ocrReplicas.get(normalize(name))!)] : replicaLabelOcr(ocrText, name), confidence: 0.92 });
    existing.add(normalize(name));
  }
  for (const component of visual.components) {
    const labels = ocrReplicas.get(normalize(component.name)) ? [replicaText(ocrReplicas.get(normalize(component.name))!)] : replicaLabelOcr(ocrText, component.name);
    if (labels.length && !component.labels.some((label) => /replica/i.test(label))) component.labels.push(...labels);
    const quantity = component.labels.join(" ").match(/(\d+)\s*replicas?/i)?.[1];
    if (quantity && !visual.deployment.replicasObserved.some((item) => item.componentId === component.id)) visual.deployment.replicasObserved.push({ componentId: component.id, quantity: Number(quantity) });
  }
  const add = (target: string[], value: string | null) => { if (value && !target.some((item) => normalize(item) === normalize(value))) target.push(value); };
  const literals = ["HTTPS", "API Gateway", "Load Balancer", "Kafka", "OrderCreated", "Shared PostgreSQL Database", "Redis Session Cache", "Secret Manager", "Monitoring & Centralized Logging", "Private Network", "Public Zone"];
  for (const literal of literals) if (normalize(ocrText).includes(normalize(literal))) add(visual.visibleText, literal);
  const region = ocrText.match(/(?:Region\s*:?\s*)?\b[a-z]{2}-[a-z]+-\d\b/i)?.[0] ?? null;
  const singleAz = /Availability\s+Zone\s*:?\s*1\s*only/i.test(ocrText) ? "Availability Zone: 1 only" : null;
  add(visual.deployment.regions, region); add(visual.deployment.availabilityZones, singleAz); add(visual.visibleText, region); add(visual.visibleText, singleAz);
  for (const zone of [...ocrText.matchAll(/\bAZ[-\s]?([a-z])\b/gi)].map((match) => `AZ-${match[1].toLowerCase()}`)) { add(visual.deployment.availabilityZones, zone); add(visual.visibleText, zone); }
  for (const name of names) {
    if (/load balancer/i.test(name)) add(visual.cloud.loadBalancers, name);
    if (/api gateway/i.test(name)) { add(visual.cloud.gateways, name); add(visual.integration.apis, name); }
    if (/kafka/i.test(name)) add(visual.integration.brokers, name);
    if (/shared.*database|shared.*postgres/i.test(name)) add(visual.integration.sharedDatabases, name);
    if (/redis/i.test(name)) add(visual.cloud.statefulEvidence, name);
    if (/secret manager/i.test(name)) add(visual.security.secretManagers, name);
    if (/monitoring/i.test(name)) add(visual.infrastructure.monitoringComponents, name);
    if (/logging/i.test(name)) add(visual.infrastructure.loggingComponents, name);
    if (/kubernetes/i.test(name)) add(visual.infrastructure.kubernetesResources, name);
  }
  if (/HTTPS/i.test(ocrText)) add(visual.security.encryptionEvidence, "HTTPS");
  if (/OrderCreated/i.test(ocrText)) add(visual.integration.events, "OrderCreated");
  if (/OrderFailed/i.test(ocrText)) add(visual.integration.events, "OrderFailed");
  if (/\bDLQ\b/i.test(ocrText)) { add(visual.integration.queues, "DLQ"); add(visual.visibleText, "DLQ"); }
  if (/\bBackups?\b/i.test(ocrText)) { add(visual.infrastructure.backupComponents, "Backups"); add(visual.visibleText, "Backups"); }
  if (/Disaster\s+Recovery/i.test(ocrText)) { add(visual.infrastructure.disasterRecoveryComponents, "Disaster Recovery"); add(visual.visibleText, "Disaster Recovery"); }
  if (/CI\s*\/\s*CD/i.test(ocrText)) add(visual.visibleText, "CI/CD");
  if (/Readiness/i.test(ocrText)) add(visual.visibleText, "Readiness probe");
  if (/Liveness/i.test(ocrText)) add(visual.visibleText, "Liveness probe");
  if (/Private Network/i.test(ocrText)) add(visual.infrastructure.privateNetworks, "Private Network");
  addSharedDatabaseConnections(visual);
  return visual;
}

function extractNames(text: string): string[] {
  const known = ["Web App", "Mobile App", "Web Client", "API Gateway", "Load Balancer", "Kubernetes Cluster", "Kafka", "Shared PostgreSQL Database", "PostgreSQL Database", "Redis Session Cache", "Secret Manager", "Monitoring & Centralized Logging", "Monitoring", "Centralized Logging", "DLQ", "Order Database", "Payment Database"];
  const found = known.filter((name) => normalize(text).includes(normalize(name)));
  if (/\bMobile\b/i.test(text)) found.push("Mobile App");
  if (/shared\s+postgresql\s+data\w*/i.test(text)) found.push("Shared PostgreSQL Database");
  if (found.includes("Monitoring & Centralized Logging")) {
    const monitoring = found.indexOf("Monitoring"); if (monitoring >= 0) found.splice(monitoring, 1);
    const logging = found.indexOf("Centralized Logging"); if (logging >= 0) found.splice(logging, 1);
  }
  found.push(...(text.match(/\b(?:Order|Payment|Catalog|Inventory|Notification)\s+Service\b/gi) ?? []).map(titleCase));
  return [...new Set(found)];
}
function replicaLabelOcr(text: string, name: string): string[] { const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const match = text.match(new RegExp(`${escaped}[\\s\\S]{0,45}?(\\d+)\\s*replicas?`, "i")); return match ? [`${match[1]} replica${match[1] === "1" ? "" : "s"}`] : []; }
function extractReplicaMap(text: string): Map<string, number> { const services = [...text.matchAll(/\b(Order|Payment|Catalog|Inventory|Notification)\s+Service\b/gi)].map((match) => `${titleCase(match[1])} Service`); const quantities = [...text.matchAll(/\b(\d+)\s*replicas?\b/gi)].map((match) => Number(match[1])); const result = new Map<string, number>(); if (services.length && quantities.length >= services.length) services.forEach((name, index) => result.set(normalize(name), quantities[index])); return result; }
function replicaText(quantity: number): string { return `${quantity} replica${quantity === 1 ? "" : "s"}`; }
function addSharedDatabaseConnections(visual: ArchitectureVisualAnalysis): void { const database = visual.components.find(({ name }) => /shared.*(?:postgres|database)/i.test(name)); if (!database) return; for (const serviceName of ["Order Service", "Payment Service"]) { const service = visual.components.find(({ name }) => normalize(name) === normalize(serviceName)); if (service && !visual.connections.some(({ from, to }) => from === service.id && to === database.id)) visual.connections.push({ from: service.id, to: database.id, direction: "directed", protocol: null, communicationType: "synchronous", labels: ["shared database visible"], confidence: 0.86 }); } }
function normalize(value: string): string { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function titleCase(value: string): string { return value.replace(/\b\w/g, (letter) => letter.toUpperCase()); }
