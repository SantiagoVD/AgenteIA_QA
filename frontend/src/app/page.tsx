"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AnalysisState, Evidence, Finding, Report } from "@/types/Analysis";

const API = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:3001";
const phases = [
  "Validating repository",
  "Cloning repository",
  "Scanning project",
  "Profiling technologies",
  "Indexing evidence",
  "Retrieving QA guidelines",
  "Running QA agents",
  "Consolidating findings",
  "Generating report",
];
const phaseLabels: Record<string, string> = {
  "Validating repository": "Validando repositorio",
  "Cloning repository": "Clonando repositorio",
  "Scanning project": "Analizando proyecto",
  "Profiling technologies": "Identificando tecnologías",
  "Indexing evidence": "Indexando evidencia",
  "Retrieving QA guidelines": "Recuperando lineamientos QA",
  "Running QA agents": "Ejecutando agentes QA",
  "Consolidating findings": "Consolidando hallazgos",
  "Generating report": "Generando reporte",
};
const domainLabels: Record<string, string> = {
  ALL: "Todos los dominios",
  "General QA": "QA general",
  "Product Quality": "Calidad del producto",
  Testing: "Pruebas",
  Security: "Seguridad",
};
const statusLabels: Record<string, string> = {
  ALL: "Todos los estados",
  CUMPLE: "Cumple",
  CUMPLE_PARCIALMENTE: "Cumple parcialmente",
  NO_CUMPLE: "No cumple",
  SIN_EVIDENCIA: "Sin evidencia",
  NO_APLICA: "No aplica",
};
const levelLabels: Record<string, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

function labelOf(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AnalysisState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!state || !["QUEUED", "PROCESSING"].includes(state.status)) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`${API}/api/analyses/${state.analysisId}`);
        setState(await response.json() as AnalysisState);
      } catch {
        // Conserva el último estado conocido si el backend tarda en responder.
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [state]);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/api/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryUrl: url }),
      });
      const value = await response.json() as AnalysisState & { error?: string };
      setState(response.ok
        ? value
        : { analysisId: "", repositoryUrl: url, status: "FAILED", phase: "", error: value.error });
    } catch {
      setState({
        analysisId: "",
        repositoryUrl: url,
        status: "FAILED",
        phase: "",
        error: "No se pudo conectar con el backend.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <Header />
      {state?.report
        ? <ReportView report={state.report} api={API} />
        : <Home url={url} setUrl={setUrl} submit={analyze} submitting={submitting} state={state} />}
      <footer>
        <span>Análisis estático</span>
        <span>Basado en evidencia</span>
        <span>Multiagente</span>
        <span>IA local</span>
      </footer>
    </main>
  );
}

function Header() {
  return (
    <header>
      <div className="brand"><span className="mark">Q</span><span>AgenteIA<em>_QA</em></span></div>
      <span className="eyebrow">AUDITORÍA DE CALIDAD DE SOFTWARE</span>
    </header>
  );
}

function Home({
  url,
  setUrl,
  submit,
  submitting,
  state,
}: {
  url: string;
  setUrl: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  state: AnalysisState | null;
}) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="kicker">Ingeniería basada en evidencia</p>
        <h1>Audita tu código con <i>lineamientos QA reales.</i></h1>
        <p className="lead">Análisis de calidad de software asistido por IA, basado en lineamientos ISO, NIST y OWASP, con evidencia de tu repositorio.</p>
        <form onSubmit={submit}>
          <label htmlFor="repo">REPOSITORIO PÚBLICO DE GITHUB</label>
          <div className="input-row">
            <input
              id="repo"
              value={url}
              onChange={event => setUrl(event.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              required
            />
            <button disabled={submitting}>{submitting ? "Iniciando…" : "Analizar repositorio →"}</button>
          </div>
        </form>
        {state && <Progress state={state} />}
      </div>
      <div className="how">
        <p className="kicker">Cómo funciona</p>
        {["Repositorio", "Análisis del código", "Lineamientos QA", "Revisión multiagente", "Reporte de cumplimiento"].map((item, index) => (
          <div className="step" key={item}>
            <b>0{index + 1}</b>
            <span>{item}</span>
            <small>{index < 4 ? "↓" : ""}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Progress({ state }: { state: AnalysisState }) {
  const current = Math.max(0, phases.indexOf(state.phase));
  const label = phaseLabels[state.phase] ?? state.phase;
  return (
    <div className={`progress ${state.status === "FAILED" ? "failure" : ""}`}>
      <span className="progress-dot" />
      <div>
        <strong>{state.status === "FAILED" ? "Análisis fallido" : label}</strong>
        <small>{state.error || (state.status === "COMPLETED" ? "Reporte listo" : `Fase ${current + 1} de ${phases.length}`)}</small>
      </div>
    </div>
  );
}

function ReportView({ report, api }: { report: Report; api: string }) {
  const [status, setStatus] = useState("ALL");
  const [domain, setDomain] = useState("ALL");
  const findings = report.findings.filter(f => (status === "ALL" || f.status === status) && (domain === "ALL" || f.domain === domain));
  const topIssues = report.findings.filter(f => f.status === "NO_CUMPLE" && ["CRITICAL", "HIGH"].includes(f.priority));
  const statuses = ["ALL", "CUMPLE", "CUMPLE_PARCIALMENTE", "NO_CUMPLE", "SIN_EVIDENCIA", "NO_APLICA"];
  const domains = ["ALL", "General QA", "Product Quality", "Testing", "Security"];

  return (
    <section className="report">
      <div className="report-head">
        <div>
          <p className="kicker">Reporte de cumplimiento QA</p>
          <h1>{report.repository.name}</h1>
          <p className="muted">{report.repository.url}{report.repository.branch ? ` · ${report.repository.branch}` : ""}{report.repository.commit ? ` · ${report.repository.commit.slice(0, 8)}` : ""}</p>
        </div>
        <span className="complete">ANÁLISIS COMPLETADO</span>
      </div>

      <div className="metrics">
        <Metric label="Cumplimiento verificado" value={report.metrics.verifiedComplianceScore === null ? "—" : `${report.metrics.verifiedComplianceScore}%`} />
        <Metric label="Cobertura de evidencia" value={report.metrics.evidenceCoverage === null ? "—" : `${report.metrics.evidenceCoverage}%`} />
        <Metric label="Lineamientos" value={report.metrics.totalGuidelines} />
        <Metric label="No cumple" value={report.metrics.nonCompliant} />
      </div>

      <div className="profile">
        <p className="kicker">Perfil tecnológico</p>
        <div>
          {[...report.profile.languages, ...report.profile.frameworks, ...report.profile.testingFrameworks, ...report.profile.cloudProviders, ...report.profile.signals.packageManagers, ...report.profile.databases, `${report.profile.filesDetected} archivos`, report.profile.hasCI ? "CI detectado" : "Sin evidencia de CI", report.profile.hasDocker ? "Docker detectado" : "Sin evidencia de Docker"].map(item => <span key={item}>{item}</span>)}
        </div>
      </div>

      {topIssues.length > 0 && <div className="top-issues">
        <p className="kicker">Hallazgos críticos / alta prioridad</p>
        {topIssues.map(f => <div key={f.guidelineId}><code>{f.guidelineId}</code><strong>{f.title}</strong><span>{labelOf(levelLabels, f.priority)}</span></div>)}
      </div>}

      <div className="findings-head">
        <h2>Hallazgos <small>{findings.length}</small></h2>
        <div className="filters">
          <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por estado">
            {statuses.map(item => <option key={item} value={item}>{labelOf(statusLabels, item)}</option>)}
          </select>
          <select value={domain} onChange={event => setDomain(event.target.value)} aria-label="Filtrar por dominio">
            {domains.map(item => <option key={item} value={item}>{labelOf(domainLabels, item)}</option>)}
          </select>
        </div>
      </div>

      <div className="findings">
        {findings.length
          ? findings.map(f => <FindingCard key={f.guidelineId} finding={f} api={api} analysisId={report.analysisId} />)
          : <div className="empty">No hay hallazgos para estos filtros.</div>}
      </div>

      <div className="summary">
        <p className="kicker">Resumen ejecutivo</p>
        <p>{report.executiveSummary}</p>
        <small>Este análisis asistido no constituye una certificación oficial ISO, OWASP o NIST.</small>
      </div>
    </section>
  );
}

function FindingCard({ finding, api, analysisId }: { finding: Finding; api: string; analysisId: string }) {
  return (
    <details className="finding">
      <summary>
        <span className="id">{finding.guidelineId}</span>
        <strong>{finding.title}</strong>
        <span className={`status ${finding.status}`}>{labelOf(statusLabels, finding.status)}</span>
      </summary>
      <div className="finding-detail">
        <div className="finding-meta">
          <span>{labelOf(domainLabels, finding.domain)}</span>
          <span>{finding.source}</span>
          <span>Prioridad: {labelOf(levelLabels, finding.priority)}</span>
          <span>Confianza: {labelOf(levelLabels, finding.confidence)}</span>
        </div>
        <p>{finding.reasoningSummary}</p>
        {finding.recommendation && <p><b>Recomendación:</b> {finding.recommendation}</p>}
        {finding.evidence.length
          ? finding.evidence.map(e => <EvidenceViewer key={`${e.relativePath}-${e.startLine}`} evidence={e} api={api} analysisId={analysisId} />)
          : <p className="muted">No se encontró evidencia del proyecto.</p>}
      </div>
    </details>
  );
}

function EvidenceViewer({ evidence, api, analysisId }: { evidence: Evidence; api: string; analysisId: string }) {
  const [content, setContent] = useState("");
  async function load() {
    if (content) return;
    const response = await fetch(`${api}/api/analyses/${analysisId}/evidence?path=${encodeURIComponent(evidence.relativePath)}`);
    const chunks = await response.json() as Array<{ content: string }>;
    setContent(chunks.find(chunk => chunk.content)?.content ?? "");
  }
  return (
    <details className="evidence" onToggle={load}>
      <summary><code>{evidence.relativePath} · líneas {evidence.startLine ?? "?"}-{evidence.endLine ?? "?"}</code></summary>
      {content && <pre>{content}</pre>}
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><small>{label}</small><strong>{value}</strong></div>;
}
