import type { ChatHistoryMessage } from "../../models/ChatRequest.ts";

export interface GuidedConversationResponse {
  kind: "SMALL_TALK" | "CLARIFICATION" | "DEFINITION" | "DISCOVERY" | "VALIDATION_HELP";
  topic: string;
  message: string;
}

type MenuSelection = "DEFINITION" | "GUIDELINES" | "DESIGN" | "VALIDATION";

const TOPICS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bapi gateway\b/, label: "API Gateway" },
  { pattern: /\bkubernetes\b|\bk8s\b/, label: "Kubernetes" },
  { pattern: /\bkafka\b/, label: "Kafka" },
  { pattern: /\bmicroservicios?\b/, label: "microservicios" },
  { pattern: /\bload balancer\b|\bbalanceador(?: de carga)?\b/, label: "balanceadores de carga" },
  { pattern: /\bcloud\b|\bnube\b/, label: "arquitectura cloud" },
];

/** Interprets conversational intent before technical routing. */
export class ConversationGuide {
  respond(question: string, history: ChatHistoryMessage[]): GuidedConversationResponse | undefined {
    const current = this.canonical(question).trim();
    if (this.isSmallTalk(current)) {
      return {
        kind: "SMALL_TALK",
        topic: "general",
        message: "¡Muy bien, gracias por preguntar! Estoy listo para ayudarte con arquitectura de software. Puedes preguntarme por un concepto, pedirme lineamientos, diseñar una solución o adjuntar un diagrama para validarlo. ¿En qué estás trabajando?",
      };
    }

    const context = this.context(question, history);
    const topic = this.findTopic(context);
    if (!topic) return undefined;

    const selection = this.menuSelection(current, history);
    if (selection === "DEFINITION" || this.requestsDefinition(current)) {
      return { kind: "DEFINITION", topic, message: this.definition(topic) };
    }
    if (selection === "DESIGN") {
      return { kind: "DISCOVERY", topic, message: this.discovery(topic) };
    }
    if (selection === "VALIDATION") {
      return { kind: "VALIDATION_HELP", topic, message: this.validationHelp(topic) };
    }
    if (this.isBareTopic(current, topic)) {
      return { kind: "CLARIFICATION", topic, message: this.clarification(topic) };
    }
    if (selection !== "GUIDELINES" && this.requestsCreation(context) && !this.hasDesignContext(context) && !this.discoveryWasAlreadyAsked(history)) {
      return { kind: "DISCOVERY", topic, message: this.discovery(topic) };
    }
    return undefined;
  }

  contextualize(question: string, history: ChatHistoryMessage[]): string {
    const topic = this.findTopic(this.context(question, history));
    const selection = this.menuSelection(this.canonical(question), history);
    if (selection === "GUIDELINES" && topic) {
      return `Lineamientos recomendados para un ${topic}: contratos de API, autenticación, autorización, control de tráfico, enrutamiento y versionado.`;
    }

    const current = question.trim();
    if (!this.isFollowUp(current, history)) return current;
    const previous = history
      .filter((message) => message.sender === "user" && message.text.trim())
      .slice(-3)
      .map((message) => message.text.trim());
    if (previous.length === 0) return current;
    return `Contexto de la conversación: ${previous.join(" → ")}\nSolicitud actual: ${current}`;
  }

  opening(question: string, history: ChatHistoryMessage[]): string | undefined {
    const topic = this.findTopic(this.context(question, history));
    return topic && this.menuSelection(this.canonical(question), history) === "GUIDELINES"
      ? `Entendido: quieres conocer los lineamientos recomendados para ${topic}.`
      : undefined;
  }

  displayQuestion(question: string, history: ChatHistoryMessage[]): string {
    const topic = this.findTopic(this.context(question, history));
    return topic && this.menuSelection(this.canonical(question), history) === "GUIDELINES"
      ? `lineamientos recomendados para ${topic}`
      : question.trim();
  }

  private clarification(topic: string): string {
    return [
      `¡Claro! Veo que quieres conversar sobre ${topic}. Para ayudarte de la mejor manera, ¿a qué te refieres exactamente?`,
      `1. Entender qué es ${topic} y para qué sirve.`,
      "2. Conocer los lineamientos recomendados.",
      `3. Diseñar o implementar ${topic} para un proyecto.`,
      "4. Validar una arquitectura o diagrama existente.",
      "Puedes responder con el número, por ejemplo «1», o explicarlo con tus propias palabras.",
      `Si quieres diseñarlo, también puedes contarme qué arquitectura utilizarás, dónde se desplegará y qué requisitos de seguridad, tráfico y disponibilidad tienes.`,
    ].join("\n\n");
  }

  private discovery(topic: string): string {
    return [
      `¡Perfecto! Puedo ayudarte a diseñar ${topic}. Para darte lineamientos útiles y no asumir una arquitectura incorrecta, cuéntame lo siguiente:`,
      "- ¿Qué estilo de arquitectura utilizarás: monolito modular, microservicios, serverless u otro?",
      "- ¿Dónde se desplegará: AWS, Azure, GCP, on-premise o una solución híbrida?",
      "- ¿Será de uso interno, público o para aplicaciones móviles y socios externos?",
      "- ¿Qué protocolos o integraciones necesitas: REST, GraphQL, eventos, Kafka u otros?",
      "- ¿Cómo manejarás autenticación y autorización: OAuth 2.0, OIDC, JWT, mTLS u otro mecanismo?",
      "- ¿Tienes requisitos de tráfico, latencia, alta disponibilidad o recuperación ante fallos?",
      "No es necesario que conozcas todas las respuestas. Con lo que tengas, te propondré una base y señalaré las decisiones pendientes.",
    ].join("\n");
  }

  private validationHelp(topic: string): string {
    return `Entendido: quieres validar ${topic} dentro de una arquitectura existente. Adjunta el diagrama en PNG, JPEG o WebP e indícame qué aspecto te preocupa. Compararé únicamente la evidencia visible con los lineamientos aplicables.`;
  }

  private definition(topic: string): string {
    if (topic === "API Gateway") {
      return [
        "Un API Gateway es el punto de entrada centralizado que reciben los consumidores antes de llegar a tus APIs o microservicios.",
        "Sus responsabilidades habituales incluyen enrutar solicitudes, validar autenticación y autorización, aplicar límites de consumo, transformar peticiones, gestionar versiones, registrar métricas y ocultar la estructura interna de los servicios.",
        "No reemplaza la lógica de negocio: funciona como una capa de gobierno y protección en el borde de la arquitectura.",
        "¿Quieres que ahora revisemos los lineamientos para implementarlo o prefieres que diseñemos uno para tu caso?",
      ].join("\n\n");
    }
    return `Puedo explicarte qué es ${topic} o ayudarte a aplicarlo en una arquitectura concreta. ¿Prefieres una explicación conceptual, lineamientos de implementación o un diseño para tu caso?`;
  }

  private menuSelection(question: string, history: ChatHistoryMessage[]): MenuSelection | undefined {
    if (!this.hasChoiceMenu(history)) return undefined;
    const value = question.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (this.matchesOption(value, "1", "uno", "una", "primera", "primero")) return "DEFINITION";
    if (this.matchesOption(value, "2", "dos", "segunda", "segundo")) return "GUIDELINES";
    if (this.matchesOption(value, "3", "tres", "tercera", "tercero")) return "DESIGN";
    if (this.matchesOption(value, "4", "cuatro", "cuarta", "cuarto")) return "VALIDATION";
    return undefined;
  }

  private matchesOption(value: string, ...alternatives: string[]): boolean {
    const options = alternatives.join("|");
    return new RegExp(`^(?:opcion\\s+)?(?:${options})$|\\b(?:opcion|la|al|a la)\\s+(?:${options})\\b|\\bme refiero a(?: la)?\\s+(?:${options})\\b|\\bme referia a(?: la)?\\s+(?:${options})\\b`).test(value);
  }

  private hasChoiceMenu(history: ChatHistoryMessage[]): boolean {
    return [...history].reverse().some((message) => message.sender === "agent" && /1\.\s*entender que es|2\.\s*conocer los lineamientos/.test(this.canonical(message.text)));
  }

  private context(question: string, history: ChatHistoryMessage[]): string {
    return this.canonical([
      ...history.filter((message) => message.sender === "user").slice(-4).map((message) => message.text),
      question,
    ].join(" "));
  }

  private findTopic(context: string): string | undefined {
    return TOPICS.find(({ pattern }) => pattern.test(context))?.label;
  }

  private requestsDefinition(question: string): boolean {
    return /\b(que es|que significa|definicion|explicame|para que sirve)\b/.test(question);
  }

  private requestsCreation(context: string): boolean {
    return /\b(crear|crearlo|crearla|disenar|disenarlo|disenarla|implementar|implementarlo|construir|lineamientos|recomendaciones)\b/.test(context);
  }

  private hasDesignContext(context: string): boolean {
    return /\b(aws|azure|gcp|on[ -]?premise|hibrid|kubernetes|k8s|serverless|microservicios?|monolito|intern[oa]|public[oa]|movil|oauth|oidc|jwt|mtls|rest|graphql|kafka|eventos?|rps|latencia|disponibilidad|multi[ -]?az)\b/.test(context);
  }

  private discoveryWasAlreadyAsked(history: ChatHistoryMessage[]): boolean {
    return history.some((message) => message.sender === "agent" && /estilo de arquitectura utilizaras|lineamientos utiles/.test(this.canonical(message.text)));
  }

  private isBareTopic(question: string, topic: string): boolean {
    const cleaned = question.replace(/[^a-z0-9]+/g, " ").trim();
    const normalizedTopic = this.canonical(topic).replace(/[^a-z0-9]+/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    return words.length <= 5 && (cleaned === normalizedTopic || cleaned === `${normalizedTopic} por favor`);
  }

  private isSmallTalk(question: string): boolean {
    return /^(?:hola\s+)?(?:como estas|que tal|como te va|todo bien)$/.test(question.replace(/[!¡?¿]/g, "").trim());
  }

  private isFollowUp(question: string, history: ChatHistoryMessage[]): boolean {
    if (!history.some((message) => message.sender === "user" && message.text.trim())) return false;
    const normalized = this.canonical(question).trim();
    return normalized.length <= 120 || /\b(eso|esto|crearlo|crearla|implementarlo|la anterior|lo anterior)\b/.test(normalized);
  }

  private canonical(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\bapi\s+(?:gatway|gateaway|gatewey|gatwey)\b/g, "api gateway");
  }
}
