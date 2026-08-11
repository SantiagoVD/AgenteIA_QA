import type { ArchitectureVisualAnalysis } from "../../models/ArchitectureVisualAnalysis.ts";
import type { ValidationAgentName } from "../shared/AgentValidationResponse.ts";

export type ArchitectureDomain = ValidationAgentName;

export interface DomainRoutingDecision {
  domain: ArchitectureDomain;
  selection: "SELECTED" | "NOT_SELECTED";
  score: number;
  reasons: string[];
}

export interface AgentRoutingDecision {
  selected: ArchitectureDomain[];
  domains: DomainRoutingDecision[];
}

type Scores = Record<ArchitectureDomain, { score: number; reasons: string[] }>;
const DOMAIN_ORDER: ArchitectureDomain[] = ["cloud", "integration", "infrastructure"];
const SELECTION_THRESHOLD = 4;

/** Selects specialists using explicit question and structured visual evidence. */
export class AgentRouter {
  route(question: string, visual?: ArchitectureVisualAnalysis): AgentRoutingDecision {
    const scores = this.emptyScores();
    this.scoreQuestion(this.normalize(question), scores);
    if (visual) this.scoreVisual(visual, scores);

    let selected = DOMAIN_ORDER.filter((domain) => scores[domain].score >= SELECTION_THRESHOLD);
    if (selected.length === 0) {
      const highest = Math.max(...DOMAIN_ORDER.map((domain) => scores[domain].score));
      if (highest > 0) selected = DOMAIN_ORDER.filter((domain) => scores[domain].score === highest);
    }

    return {
      selected,
      domains: DOMAIN_ORDER.map((domain) => ({
        domain,
        selection: selected.includes(domain) ? "SELECTED" : "NOT_SELECTED",
        score: scores[domain].score,
        reasons: scores[domain].reasons,
      })),
    };
  }

  private scoreQuestion(question: string, scores: Scores): void {
    this.addWhen(scores, "cloud", question, /\b(cloud|nube|aws|azure|gcp|google cloud|oracle cloud)\b/, 5, "La consulta menciona una plataforma cloud.");
    this.addWhen(scores, "cloud", question, /\b(region|regiones|availability zone|zona de disponibilidad|multi[ -]?az|serverless|autoscal|escalamiento automatico|servicio administrado|managed service|load balancer|balanceador)\b/, 4, "La consulta contiene decisiones propias de despliegue cloud.");

    this.addWhen(scores, "integration", question, /\b(api gateway|api|apis|rest|graphql|soap|endpoint|webhook|contrato|versionado|http)\b/, 5, "La consulta trata contratos, exposición o gobierno de APIs.");
    this.addWhen(scores, "integration", question, /\b(kafka|rabbitmq|broker|cola|colas|queue|evento|eventos|asincron|mensajeria|pub[\/-]?sub)\b/, 5, "La consulta trata mensajería o integración asíncrona.");
    this.addWhen(scores, "integration", question, /\b(integracion|integrar|interoperabilidad|sistemas externos|punto a punto|base de datos compartida)\b/, 4, "La consulta solicita una decisión de integración entre sistemas.");

    this.addWhen(scores, "infrastructure", question, /\b(kubernetes|k8s|docker|contenedor|contenedores|cluster|helm)\b/, 5, "La consulta menciona plataforma de contenedores u orquestación.");
    this.addWhen(scores, "infrastructure", question, /\b(vpc|subnet|subred|firewall|red privada|red publica|network|servidor|maquina virtual|vm)\b/, 4, "La consulta contiene elementos de red o cómputo de infraestructura.");
    this.addWhen(scores, "infrastructure", question, /\b(ci[\/-]?cd|pipeline|despliegue|deploy|observabilidad|monitoreo|monitorizacion|logs?|backup|respaldo|disaster recovery|recuperacion ante desastres)\b/, 4, "La consulta trata operación, despliegue o continuidad de infraestructura.");

    if (/\b(plataforma|solucion integral|arquitectura completa|sistema completo|full[ -]?stack)\b/.test(question)) {
      for (const domain of DOMAIN_ORDER) this.add(scores, domain, 4, "La consulta pide una solución de alcance transversal.");
    }
  }

  private scoreVisual(visual: ArchitectureVisualAnalysis, scores: Scores): void {
    if (visual.deployment.regions.length || visual.deployment.availabilityZones.length) this.add(scores, "cloud", 5, "La imagen muestra regiones o zonas de disponibilidad.");
    if (visual.cloud.loadBalancers.length || visual.cloud.managedServices.length || visual.cloud.autoscalingObserved !== null || visual.cloud.statelessEvidence.length || visual.cloud.statefulEvidence.length) this.add(scores, "cloud", 4, "La descripción visual contiene capacidades cloud explícitas.");

    if (visual.integration.apis.length || visual.cloud.gateways.length || visual.security.exposedComponents.length) this.add(scores, "integration", 5, "La imagen muestra APIs, gateways o componentes expuestos.");
    if (visual.integration.brokers.length || visual.integration.queues.length || visual.integration.topics.length || visual.integration.events.length) this.add(scores, "integration", 5, "La imagen muestra mensajería o eventos.");
    if (visual.integration.sharedDatabases.length || visual.integration.pointToPointConnections.length) this.add(scores, "integration", 5, "La imagen muestra acoplamiento de datos o conexiones punto a punto.");
    if (visual.connections.length) this.add(scores, "integration", 2, "La imagen contiene conexiones entre componentes.");

    if (visual.infrastructure.containers.length || visual.infrastructure.kubernetesResources.length || visual.deployment.clusters.length) this.add(scores, "infrastructure", 5, "La imagen muestra contenedores, Kubernetes o clústeres.");
    if (visual.infrastructure.publicNetworks.length || visual.infrastructure.privateNetworks.length || visual.infrastructure.firewalls.length) this.add(scores, "infrastructure", 5, "La imagen muestra redes o controles perimetrales.");
    if (visual.infrastructure.monitoringComponents.length || visual.infrastructure.loggingComponents.length || visual.infrastructure.backupComponents.length || visual.infrastructure.disasterRecoveryComponents.length) this.add(scores, "infrastructure", 4, "La imagen muestra capacidades operativas o de continuidad.");
    if (visual.deployment.replicasObserved.length || visual.deployment.environments.length) this.add(scores, "infrastructure", 3, "La imagen contiene evidencia de réplicas o ambientes de despliegue.");
  }

  private addWhen(scores: Scores, domain: ArchitectureDomain, value: string, pattern: RegExp, points: number, reason: string): void {
    if (pattern.test(value)) this.add(scores, domain, points, reason);
  }

  private add(scores: Scores, domain: ArchitectureDomain, points: number, reason: string): void {
    if (scores[domain].reasons.includes(reason)) return;
    scores[domain].score += points;
    scores[domain].reasons.push(reason);
  }

  private emptyScores(): Scores {
    return {
      cloud: { score: 0, reasons: [] },
      integration: { score: 0, reasons: [] },
      infrastructure: { score: 0, reasons: [] },
    };
  }

  private normalize(value: string): string {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}
