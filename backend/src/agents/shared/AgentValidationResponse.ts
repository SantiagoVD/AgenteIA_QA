import type { ArchitectureVisualAnalysis } from "../../models/ArchitectureVisualAnalysis.ts";

export type ValidationStatus = "COMPLIANT" | "NON_COMPLIANT" | "NOT_EVIDENT" | "NOT_APPLICABLE";
export type ValidationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ValidationAgentName = "cloud" | "integration" | "infrastructure";

export interface ValidationFinding {
  ruleId: string;
  ruleTitle: string;
  status: ValidationStatus;
  priority: ValidationPriority;
  relatedComponents: string[];
  visualEvidence: string[];
  guidelineEvidence: string;
  explanation: string;
  risk: string | null;
  recommendation: string | null;
  source: { document: string; page: number | null; section: string | null };
  confidence: number;
}

export interface AgentValidationResponse {
  agent: ValidationAgentName;
  mode: "VALIDATION";
  summary: string;
  findings: ValidationFinding[];
  unansweredQuestions: string[];
  retrievedRuleIds: string[];
  hasSufficientDomainEvidence: boolean;
}

export interface AgentValidationInput {
  requestId: string;
  question: string;
  visualEvidence: ArchitectureVisualAnalysis;
}

export function assertAgentValidationResponse(value: AgentValidationResponse): AgentValidationResponse {
  const statuses = new Set<ValidationStatus>(["COMPLIANT", "NON_COMPLIANT", "NOT_EVIDENT", "NOT_APPLICABLE"]);
  if (value.mode !== "VALIDATION" || !Array.isArray(value.findings) || !Array.isArray(value.retrievedRuleIds)) throw new ValidationSchemaError("Respuesta de validación inválida.");
  for (const finding of value.findings) {
    if (!finding.ruleId || !statuses.has(finding.status) || !Array.isArray(finding.visualEvidence) || !finding.guidelineEvidence || finding.confidence < 0 || finding.confidence > 1) {
      throw new ValidationSchemaError(`Finding inválido para ${finding.ruleId || "regla desconocida"}.`);
    }
  }
  return value;
}

export class ValidationSchemaError extends Error {
  override name = "ValidationSchemaError";
}
