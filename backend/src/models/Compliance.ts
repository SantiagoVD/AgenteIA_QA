export type ComplianceStatus = "CUMPLE" | "CUMPLE_PARCIALMENTE" | "NO_CUMPLE" | "SIN_EVIDENCIA" | "NO_APLICA";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Evidence { relativePath: string; startLine?: number; endLine?: number; description: string; evidenceType: string; }
export interface ComplianceFinding {
  guidelineId: string; title: string; domain: string; source: string;
  status: ComplianceStatus; confidence: Confidence; priority: Priority;
  evidence: Evidence[]; reasoningSummary: string; recommendation?: string;
}
export interface ComplianceMetrics { totalGuidelines: number; compliant: number; partiallyCompliant: number; nonCompliant: number; noEvidence: number; notApplicable: number; verifiedComplianceScore: number | null; evidenceCoverage: number | null; }
export interface ProjectProfile { languages: string[]; frameworks: string[]; hasFrontend: boolean; hasBackend: boolean; hasTests: boolean; hasCI: boolean; hasDocker: boolean; projectType: string[]; databases: string[]; testingFrameworks: string[]; filesDetected: number; cloudProviders: string[]; hasInfrastructure: boolean; hasAuthentication: boolean; coverage: "not available"; signals: { hasEnvExample: boolean; hasPotentialSecrets: boolean; hasCorsSignal: boolean; packageManagers: string[]; documentationFiles: number; configFiles: number; }; }
export interface AnalysisReport { analysisId: string; repository: { url: string; name: string; branch?: string; commit?: string }; profile: ProjectProfile; findings: ComplianceFinding[]; metrics: ComplianceMetrics; executiveSummary: string; createdAt: string; }

export function calculateMetrics(findings: ComplianceFinding[]): ComplianceMetrics {
  const count = (status: ComplianceStatus) => findings.filter((f) => f.status === status).length;
  const compliant = count("CUMPLE"), partial = count("CUMPLE_PARCIALMENTE"), non = count("NO_CUMPLE"), none = count("SIN_EVIDENCIA"), na = count("NO_APLICA");
  const denominator = compliant + partial + non;
  const applicable = findings.length - na;
  return { totalGuidelines: findings.length, compliant, partiallyCompliant: partial, nonCompliant: non, noEvidence: none, notApplicable: na, verifiedComplianceScore: denominator ? Math.round(((compliant + partial * 0.5) / denominator) * 100) : null, evidenceCoverage: applicable ? Math.round((denominator / applicable) * 100) : null };
}
