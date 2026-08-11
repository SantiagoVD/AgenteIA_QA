import type { ILLMProvider } from "../../llm/ILLMProvider.ts";
import type { AgentResponse } from "./AgentResponse.ts";
import type { IAgent } from "./IAgent.ts";
import type { AgentValidationInput, AgentValidationResponse, ValidationAgentName } from "./AgentValidationResponse.ts";
import type { RetrievedGuideline } from "./RetrievedGuideline.ts";
import { validateDomain } from "./ValidationEngine.ts";

interface Concept { terms: string[]; evidence: string[]; finding: string; recommendation: string; risk: string; }

const concepts: Record<string, Concept[]> = {
  Cloud: [
    { terms: ["escal", "carga", "crecimiento", "concurrent"], evidence: ["stateless", "escalamiento horizontal"], finding: "La evidencia vincula servicios sin estado con escalamiento horizontal.", recommendation: "Diseña los servicios sin estado y externaliza el estado de sesión para poder aumentar instancias sin modificar el servicio.", risk: "Evita depender de escalamiento vertical o de estado local, porque limita la capacidad de crecimiento." },
    { terms: ["critic", "disponib", "continuidad", "caida"], evidence: ["múltiples instancias", "balanceadores"], finding: "Los lineamientos asocian disponibilidad con réplicas, balanceo y recuperación automática.", recommendation: "Distribuye componentes críticos en varias instancias detrás de un balanceador y habilita recuperación automática.", risk: "Evita puntos únicos de falla en los componentes críticos." },
    { terms: ["segur", "secreto", "credencial", "cifrado"], evidence: ["secret", "credenciales"], finding: "La configuración y los secretos deben quedar fuera del código.", recommendation: "Externaliza configuraciones y secretos, y aplica mínimo privilegio, cifrado y auditoría.", risk: "No almacenes credenciales en el repositorio." },
    { terms: ["monitor", "observ", "alert", "log"], evidence: ["logging", "métricas"], finding: "La observabilidad se basa en logs, métricas, trazas y alertas.", recommendation: "Incorpora observabilidad desde el diseño para detectar incidentes de forma temprana.", risk: "Sin visibilidad operativa los incidentes se detectan tarde." },
  ],
  Integration: [
    { terms: ["api", "rest", "endpoint", "http", "contrato"], evidence: ["contratos", "api"], finding: "La integración requiere contratos claros, recursos consistentes y versionado ante cambios incompatibles.", recommendation: "Define contratos versionados con entradas, salidas, errores y validaciones; usa recursos y métodos HTTP coherentes.", risk: "Evita romper contratos consumidos por otros sistemas." },
    { terms: ["integr", "sistema", "servicio", "microservicio"], evidence: ["bajo acoplamiento", "contratos"], finding: "Los lineamientos priorizan bajo acoplamiento e independencia tecnológica entre sistemas.", recommendation: "Integra sistemas mediante contratos explícitos y evita dependencias directas o bases de datos compartidas.", risk: "Las integraciones punto a punto y los contratos ambiguos elevan el impacto de los cambios." },
    { terms: ["evento", "pago", "inventario", "venta", "asincron", "kafka", "rabbit"], evidence: ["eventos", "idempotencia"], finding: "Los eventos representan hechos de negocio y requieren procesamiento idempotente.", recommendation: "Usa eventos para procesos desacoplados y aplica idempotencia, reintentos y manejo de errores para evitar duplicidades.", risk: "Sin idempotencia un reintento puede procesar la misma operación más de una vez." },
    { terms: ["critic", "resilien", "disponib"], evidence: ["resiliencia", "reintento"], finding: "La resiliencia de integración depende de tolerar fallos temporales y recuperarse.", recommendation: "Define mecanismos de reintento y recuperación en las integraciones que puedan fallar temporalmente.", risk: "Una dependencia síncrona sin recuperación puede interrumpir el flujo completo." },
  ],
  Infrastructure: [
    { terms: ["despleg", "docker", "kubernetes", "api", "cicd", "pipeline"], evidence: ["contenedores", "kubernetes"], finding: "La infraestructura propuesta usa contenedores, orquestación y despliegues automatizados.", recommendation: "Empaqueta una aplicación por contenedor y automatiza compilación, pruebas, construcción y despliegue; en Kubernetes define réplicas, límites y probes.", risk: "Evita configuraciones manuales y contenedores con varias responsabilidades." },
    { terms: ["critic", "disponib", "continuidad", "caida"], evidence: ["múltiples instancias", "balanceadores"], finding: "La continuidad operativa requiere réplicas, balanceo y recuperación automática.", recommendation: "Implementa múltiples réplicas, balanceadores y monitoreo continuo para los servicios críticos.", risk: "Un servidor único no cubre la disponibilidad requerida." },
    { terms: ["monitor", "observ", "alert", "log"], evidence: ["monitoreo", "logs"], finding: "La operación debe observar recursos, latencia, disponibilidad y eventos centralizados.", recommendation: "Centraliza logs y métricas, y configura alertas para CPU, memoria, disco, red, latencia y disponibilidad.", risk: "La ausencia de monitoreo retrasa el diagnóstico de incidentes." },
    { terms: ["segur", "red", "firewall", "credencial"], evidence: ["seguridad", "redes"], finding: "La seguridad forma parte del diseño de infraestructura desde el inicio.", recommendation: "Separa ambientes y segmentos de red, limita accesos y protege secretos y credenciales.", risk: "No expongas credenciales ni compartas ambientes sin aislamiento." },
    { terms: ["respaldo", "recovery", "desastre"], evidence: ["recuperación", "respaldos"], finding: "La continuidad requiere respaldos y un plan de recuperación probado.", recommendation: "Define responsables, frecuencia de respaldos y objetivos de recuperación, y prueba el procedimiento periódicamente.", risk: "Un plan no probado puede fallar durante un incidente real." },
  ],
};

export abstract class BaseAgent implements IAgent {
  protected readonly llm: ILLMProvider;
  private readonly name: string;
  private readonly prompt: string;
  private readonly retrieve: (question: string) => Promise<string[]>;
  private readonly validationName: ValidationAgentName;
  private readonly retrieveValidation: (queries: string[]) => Promise<RetrievedGuideline[]>;

  constructor(llm: ILLMProvider, name: string, prompt: string, retrieve: (question: string) => Promise<string[]>, retrieveValidation: (queries: string[]) => Promise<RetrievedGuideline[]>) {
    this.llm = llm; this.name = name; this.prompt = prompt; this.retrieve = retrieve;
    this.validationName = name.toLowerCase() as ValidationAgentName;
    this.retrieveValidation = retrieveValidation;
  }

  async answer(question: string): Promise<AgentResponse> {
    const context = await this.retrieve(question);
    const corpus = this.normalize(context.join(" "));
    const query = this.normalize(question);
    const broad = /plataforma|arquitectura|comercio|bancari/.test(query);
    const matched = (concepts[this.name] ?? []).filter((concept) => concept.evidence.some((evidence) => corpus.includes(this.normalize(evidence))) && (broad || concept.terms.some((term) => query.includes(term))));
    const selected = matched.slice(0, 3);
    const relevant = selected.length > 0;
    const findings = selected.map((item) => item.finding);
    const recommendations = selected.map((item) => item.recommendation);
    const risks = selected.map((item) => item.risk);
    const response = relevant ? `${this.name}: Hallazgos: ${findings.join(" ")} Recomendaciones: ${recommendations.join(" ")} Riesgos: ${risks.join(" ")}` : `${this.name}: no se encontró evidencia suficiente.`;
    const allRuleIds = [...new Set(context.flatMap((chunk) => [...chunk.matchAll(/RULE_ID:\s*([A-Z0-9-]+)/g)].map((match) => match[1])))];
    const ruleIds = this.relevantRuleIds(query, allRuleIds);
    return { agent: this.name, response, context, relevant, findings, recommendations, risks, ruleIds };
  }

  async validate(input: AgentValidationInput): Promise<AgentValidationResponse> {
    return validateDomain(this.validationName, input, this.retrieveValidation);
  }

  private relevantRuleIds(query: string, ruleIds: string[]): string[] {
    if (this.name !== "Integration" || !/api\s+gateway/.test(query)) return ruleIds;
    const focused = ruleIds.filter((ruleId) => /^INT-(?:GATEWAY|API|REST|SEC|TRACE|AUTH|RATE)-/.test(ruleId));
    return focused.length > 0 ? focused : ruleIds;
  }

  private normalize(value: string): string { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
}
