import type { ILLMProvider } from "../../llm/ILLMProvider.ts";
import type { ChatHistoryMessage } from "../../models/ChatRequest.ts";
import { CloudAgent } from "../cloud/CloudAgent.ts";
import { IntegrationAgent } from "../integration/IntegrationAgent.ts";
import { InfrastructureAgent } from "../infrastructure/InfrastructureAgent.ts";
import type { AgentResponse } from "../shared/AgentResponse.ts";
import type { ArchitectureVisualAnalysis } from "../../models/ArchitectureVisualAnalysis.ts";
import { detectArchitectureRequestMode } from "../../models/ArchitectureRequestMode.ts";
import type { AgentValidationInput, AgentValidationResponse, ValidationFinding } from "../shared/AgentValidationResponse.ts";
import { constants, logEvent } from "../../config/constants.ts";
import type { IAgent } from "../shared/IAgent.ts";
import { AgentRouter, type AgentRoutingDecision, type ArchitectureDomain } from "./AgentRouter.ts";
import { ConversationGuide } from "./ConversationGuide.ts";

export interface SupplementalDocument {
  name: string;
  text: string;
}

/** Coordinates the three specialists and presents one architecture decision. */
export class OrchestratorAgent {
  private readonly llm: ILLMProvider;
  private readonly cloud: IAgent;
  private readonly integration: IAgent;
  private readonly infrastructure: IAgent;
  private readonly router: AgentRouter;
  private readonly conversation: ConversationGuide;

  constructor(
    llm: ILLMProvider,
    cloud: IAgent = new CloudAgent(llm),
    integration: IAgent = new IntegrationAgent(llm),
    infrastructure: IAgent = new InfrastructureAgent(llm),
    router: AgentRouter = new AgentRouter(),
    conversation: ConversationGuide = new ConversationGuide(),
  ) {
    this.llm = llm;
    this.cloud = cloud;
    this.integration = integration;
    this.infrastructure = infrastructure;
    this.router = router;
    this.conversation = conversation;
  }

  async answer(question: string, supplementalDocuments: SupplementalDocument[] = [], imageNames: string[] = [], history: ChatHistoryMessage[] = [], architectureImage?: { type: string; content: string }, requestId = "internal"): Promise<string> {
    const mode = detectArchitectureRequestMode(Boolean(architectureImage), question);
    if (this.isGreeting(question) && !architectureImage && supplementalDocuments.length === 0) {
      return "Hola, soy tu agente de arquitectura. Puedo ayudarte a revisar cloud, integración e infraestructura con base en los lineamientos disponibles.";
    }
    if (mode === "VALIDATION" && !architectureImage) {
      return "Estado general: INCONCLUSIVE\n\nNo se recibió una imagen o evidencia estructurada de la arquitectura. Adjunta el diagrama para comparar evidencia visible contra los lineamientos.";
    }
    if (!architectureImage && supplementalDocuments.length === 0) {
      const guided = this.conversation.respond(question, history);
      if (guided) {
        await logEvent("orchestrator.conversation.guided", { requestId, kind: guided.kind, topic: guided.topic });
        return guided.message;
      }
    }
    const visualStartedAt = Date.now();
    const visual = architectureImage ? await this.llm.analyzeArchitectureImage(architectureImage.content, architectureImage.type) : undefined;
    if (mode === "VALIDATION" && visual) {
      if (constants.validationDebug) await logEvent("validation.visual.completed", { durationMs: Date.now() - visualStartedAt, components: visual.components.map(({ name }) => name), uncertainties: visual.uncertainties.length });
      return this.validateArchitecture(question, visual, requestId);
    }
    const analysisQuestion = `${this.conversation.contextualize(question, history)}${visual ? `\nEvidencia visual observada: ${this.visualEvidence(visual)}` : ""}`;
    const routing = this.router.route(analysisQuestion, visual);
    await this.logRouting(requestId, mode, routing);
    const reports: AgentResponse[] = [];
    for (const domain of routing.selected) reports.push(await this.agent(domain).answer(analysisQuestion));

    if (this.isGreeting(question)) {
      return "Hola, soy tu agente de arquitectura. Puedo ayudarte a revisar cloud, integración e infraestructura con base en los lineamientos disponibles.";
    }

    const relevant = reports.filter((result) => result.relevant);
    if (relevant.length === 0 && supplementalDocuments.length === 0) {
      return "No encontré información relacionada con esta consulta dentro de los lineamientos de arquitectura disponibles. Mi conocimiento está limitado a arquitectura Cloud, Integración e Infraestructura.";
    }

    const parts: string[] = [];
    if (supplementalDocuments.length > 0) {
      parts.push(this.analyzeSupplementalDocuments(question, supplementalDocuments));
    }
    if (relevant.length > 0) {
      const opening = this.conversation.opening(question, history);
      parts.push([opening, this.synthesize(this.conversation.displayQuestion(question, history), relevant)].filter(Boolean).join("\n\n"));
    }
    if (imageNames.length > 0) {
      parts.push(`Se analizó ${imageNames.length === 1 ? `la imagen "${imageNames[0]}"` : `${imageNames.length} imágenes`} antes de recuperar los lineamientos. Las recomendaciones se limitan a la evidencia visible y a las reglas RAG recuperadas.`);
    }

    return parts.join("\n\n");
  }

  private async validateArchitecture(question: string, visual: ArchitectureVisualAnalysis, requestId: string): Promise<string> {
    const input: AgentValidationInput = { requestId, question, visualEvidence: visual };
    const startedAt = Date.now();
    const routing = this.router.route(question, visual);
    await this.logRouting(requestId, "VALIDATION", routing);
    const reports: AgentValidationResponse[] = [];
    for (const domain of routing.selected) {
      reports.push(await this.timedValidation(domain, () => this.agent(domain).validate(input)));
    }
    if (constants.validationDebug) await logEvent("validation.orchestrator.completed", {
      durationMs: Date.now() - startedAt,
      agents: reports.map((report) => ({ agent: report.agent, ruleIds: report.retrievedRuleIds, statuses: report.findings.map(({ ruleId, status }) => ({ ruleId, status })) })),
    });
    return this.consolidateValidation(visual, reports);
  }

  private async timedValidation(agent: string, execute: () => Promise<AgentValidationResponse>): Promise<AgentValidationResponse> {
    const startedAt = Date.now();
    try {
      const result = await execute();
      if (constants.validationDebug) await logEvent("validation.agent.completed", { agent, durationMs: Date.now() - startedAt, ruleIds: result.retrievedRuleIds, statuses: result.findings.map(({ ruleId, status }) => ({ ruleId, status })) });
      return result;
    } catch (error) {
      await logEvent("validation.agent.failed", { agent, durationMs: Date.now() - startedAt, error }, true);
      throw error;
    }
  }

  private consolidateValidation(visual: ArchitectureVisualAnalysis, reports: AgentValidationResponse[]): string {
    const findings = reports.flatMap((report) => report.findings);
    const compliant = findings.filter((finding) => finding.status === "COMPLIANT");
    const nonCompliant = findings.filter((finding) => finding.status === "NON_COMPLIANT");
    const notEvident = findings.filter((finding) => finding.status === "NOT_EVIDENT");
    const notApplicable = findings.filter((finding) => finding.status === "NOT_APPLICABLE");
    const overall = this.overallStatus(findings);
    const components = visual.components.map(({ name, labels }) => `${name}${labels.length ? ` (${labels.join(", ")})` : ""}`).filter(Boolean);
    const risks = nonCompliant.filter((finding) => finding.risk).sort(this.byPriority).slice(0, 8);
    const recommendations = nonCompliant.filter((finding) => finding.recommendation).sort(this.byPriority).slice(0, 8);
    const questions = [...new Set(reports.flatMap((report) => report.unansweredQuestions))].slice(0, 8);

    return [
      `Estado general: ${overall}`,
      `Resumen ejecutivo\nSe evaluaron ${findings.length} reglas recuperadas de ${reports.length} ${reports.length === 1 ? "dominio seleccionado" : "dominios seleccionados"}. Se confirmaron ${compliant.length} cumplimientos, ${nonCompliant.length} incumplimientos y ${notEvident.length} puntos sin evidencia suficiente. Los lineamientos se trataron como requisitos, no como características implementadas.`,
      `Componentes principales detectados\n${components.length ? components.map((name) => `- ${name}`).join("\n") : "- No fue posible estructurar nombres de componentes con suficiente confianza."}`,
      this.findingsSection("Cumplimientos confirmados", compliant),
      this.findingsSection("Incumplimientos confirmados", nonCompliant),
      this.findingsSection("Sin evidencia suficiente", notEvident),
      this.findingsSection("No aplicables relevantes", notApplicable),
      `Riesgos priorizados\n${risks.length ? risks.map((finding) => `- [${finding.priority}] ${finding.risk} (${finding.ruleId})`).join("\n") : "- No se confirmaron riesgos adicionales mediante evidencia visual."}`,
      `Recomendaciones priorizadas\n${recommendations.length ? recommendations.map((finding) => `- [${finding.priority}] ${finding.recommendation} Componentes: ${finding.relatedComponents.join(", ") || "no determinados"}. (${finding.ruleId})`).join("\n") : "- No hay recomendaciones derivadas de incumplimientos confirmados."}`,
      `Preguntas de aclaración\n${questions.length ? questions.map((question) => `- ${question}`).join("\n") : "- No se requieren aclaraciones adicionales para los findings evaluados."}`,
      `Fuentes y ruleId\n${reports.map((report) => `- ${report.agent}: ${report.retrievedRuleIds.join(", ") || "sin reglas"}`).join("\n")}`,
    ].join("\n\n");
  }

  private findingsSection(title: string, findings: ValidationFinding[]): string {
    if (!findings.length) return `${title}\n- Ninguno.`;
    return `${title}\n${findings.map((finding) => {
      const evidence = finding.visualEvidence.length ? finding.visualEvidence.join("; ") : "no visible";
      return `- [${finding.status}] ${finding.ruleId} — ${finding.ruleTitle}. Evidencia visual: ${evidence}. ${finding.explanation} Fuente: ${finding.source.document}${finding.source.section ? `, ${finding.source.section}` : ""}.`;
    }).join("\n")}`;
  }

  private overallStatus(findings: ValidationFinding[]): "COMPLIANT" | "PARTIAL_COMPLIANCE" | "NON_COMPLIANT" | "INCONCLUSIVE" {
    const nonCompliant = findings.filter((finding) => finding.status === "NON_COMPLIANT");
    if (nonCompliant.some((finding) => finding.priority === "CRITICAL" || finding.priority === "HIGH")) return "NON_COMPLIANT";
    const compliant = findings.filter((finding) => finding.status === "COMPLIANT").length;
    if (nonCompliant.length && compliant) return "PARTIAL_COMPLIANCE";
    if (!nonCompliant.length && compliant && findings.some((finding) => finding.status !== "NOT_EVIDENT")) return "COMPLIANT";
    return "INCONCLUSIVE";
  }

  private byPriority(left: ValidationFinding, right: ValidationFinding): number {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return rank[left.priority] - rank[right.priority];
  }

  private synthesize(question: string, reports: AgentResponse[]): string {
    const decisions = this.unique(reports.flatMap((report) => report.recommendations));
    const findings = this.unique(reports.flatMap((report) => report.findings));
    const risks = this.unique(reports.flatMap((report) => report.risks));
    const ruleIds = [...new Set(reports.flatMap((report) => report.ruleIds))];
    const contributions = reports
      .map((report) => {
        const decision = report.recommendations[0] ?? report.findings[0];
        return decision ? `${this.label(report.agent)} aporta que ${this.lowercaseStart(decision)}` : "";
      })
      .filter(Boolean);

    const recommendationText = decisions.slice(0, 5).map((decision) => `- ${decision}`).join("\n");
    const riskText = risks.length > 0
      ? `Riesgos a controlar:\n${risks.slice(0, 4).map((risk) => `- ${risk}`).join("\n")}`
      : "Riesgos: los lineamientos recuperados no señalan un riesgo específico adicional para esta consulta.";
    const evidenceText = findings.length > 0
      ? `La evidencia recuperada destaca: ${findings.slice(0, 3).join(" ")}`
      : "La evidencia recuperada no contiene hallazgos adicionales para detallar.";

    return [
      reports.length === 1 ? `Recomendación de ${this.label(reports[0].agent)}` : reports.length === 3 ? "Propuesta de arquitectura integral" : "Propuesta de arquitectura coordinada",
      `Para responder «${question.trim()}», los hallazgos pertinentes se complementan de la siguiente manera: ${contributions.join(" ")}`,
      evidenceText,
      "Decisiones recomendadas:",
      recommendationText || "- No se identificó una decisión sustentada adicional.",
      riskText,
      ruleIds.length > 0 ? `Fuentes RAG: ${ruleIds.join(", ")}.` : "Fuentes RAG: no se recuperaron reglas específicas.",
      "Conclusión técnica: la solución debe aplicar estas decisiones como un conjunto; el alcance de la recomendación está limitado a la evidencia recuperada de los lineamientos.",
    ].join("\n\n");
  }

  private visualEvidence(visual: ArchitectureVisualAnalysis): string {
    return [visual.summary, ...visual.components.map((component) => `${component.name} ${component.type}`), ...visual.connections.map((connection) => `${connection.from} ${connection.protocol ?? "conexión"} ${connection.to}`), ...visual.visibleText].join(". ").slice(0, 8000);
  }

  private agent(domain: ArchitectureDomain): IAgent {
    if (domain === "cloud") return this.cloud;
    if (domain === "integration") return this.integration;
    return this.infrastructure;
  }

  private async logRouting(requestId: string, mode: string, routing: AgentRoutingDecision): Promise<void> {
    await logEvent("orchestrator.routing.completed", {
      requestId,
      mode,
      selected: routing.selected,
      domains: routing.domains,
    });
  }

  private analyzeSupplementalDocuments(question: string, documents: SupplementalDocument[]): string {
    const excerpts = documents
      .map((document) => ({ name: document.name, excerpt: this.findRelevantSentences(question, document.text) }))
      .filter((document) => document.excerpt);

    if (excerpts.length === 0) {
      return "El documento adjunto no contiene evidencia textual suficiente para relacionarla con la consulta.";
    }

    return `Evidencia recuperada de los documentos adjuntos:\n${excerpts.map(({ name, excerpt }) => `- ${name}: ${excerpt}`).join("\n")}`;
  }

  private findRelevantSentences(question: string, text: string): string {
    const keywords = this.normalize(question).split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
    const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
    return sentences
      .map((sentence, index) => ({ sentence: sentence.trim(), index, score: keywords.reduce((score, keyword) => score + (this.normalize(sentence).includes(keyword) ? 1 : 0), 0) }))
      .filter((item) => item.sentence.length >= 25)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 3)
      .sort((left, right) => left.index - right.index)
      .map((item) => item.sentence)
      .join(" ")
      .slice(0, 700)
      .trim();
  }

  private isGreeting(question: string): boolean {
    return ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hello", "hi"].includes(this.normalize(question).trim());
  }

  private label(agent: string): string {
    return agent === "Cloud" ? "Cloud" : agent === "Integration" ? "Integración" : "Infraestructura";
  }

  private lowercaseStart(value: string): string {
    return value.length > 0 ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
  }

  private unique(values: string[]): string[] {
    const seen = new Set<string>();
    return values.filter((value) => {
      const key = this.normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private normalize(value: string): string {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}
