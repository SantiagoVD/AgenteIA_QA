---
source: "NIST SP 800-218 SSDF v1.1 - interpretación operativa"
version: "1.1"
domain: "secure_software_development"
document_type: "reference_mapping"
official_url: "https://csrc.nist.gov/pubs/sp/800/218/final"
---

# Lineamientos operativos de desarrollo seguro

NIST SSDF organiza prácticas de desarrollo seguro que pueden integrarse en diferentes ciclos de vida. Los siguientes controles están redactados para evaluación automática de evidencia.

## Preparar la organización

### QA-SSDF-PO-001 — Responsabilidades de seguridad
**Regla:** Las responsabilidades de seguridad y calidad relevantes deben estar asignadas o documentadas.  
**Evidencia:** roles, CODEOWNERS, políticas, responsables de revisión.

### QA-SSDF-PO-002 — Requisitos de seguridad
**Regla:** Los requisitos de seguridad aplicables deben definirse antes de considerar finalizado el desarrollo.  
**Evidencia:** historias, controles, threat model, checklist o criterios de aceptación.

### QA-SSDF-PO-003 — Herramientas y configuración
**Regla:** Las herramientas utilizadas para construir, probar y desplegar deben estar identificadas y configuradas de manera reproducible.  
**Evidencia:** lockfiles, pipelines, contenedores, scripts, versiones.

## Proteger el software

### QA-SSDF-PS-001 — Protección del código fuente
**Regla:** El repositorio debe aplicar controles apropiados para impedir cambios no autorizados.  
**Evidencia:** permisos, branch protection, MFA organizacional, revisiones.

### QA-SSDF-PS-002 — Integridad de artefactos
**Regla:** Debe ser posible relacionar un artefacto desplegado con una versión de código y un proceso de construcción identificables.  
**Evidencia:** tags, hashes, release, pipeline, artefactos versionados.

### QA-SSDF-PS-003 — Gestión de secretos
**Regla:** Los secretos no deben almacenarse en texto plano dentro del repositorio.  
**Evidencia:** secret manager, variables protegidas, detección de secretos.

## Producir software bien protegido

### QA-SSDF-PW-001 — Diseño considerando riesgo
**Regla:** Las funciones de mayor riesgo deben incorporar controles de seguridad desde el diseño.  
**Evidencia:** threat model, arquitectura, ADR, controles de autorización.

### QA-SSDF-PW-002 — Dependencias controladas
**Regla:** Las dependencias externas deben estar identificadas, versionadas y revisadas para vulnerabilidades conocidas cuando sea viable.  
**Evidencia:** lockfile, SBOM, Dependabot, SCA o reporte equivalente.

### QA-SSDF-PW-003 — Revisión de código
**Regla:** Los cambios sensibles deben ser revisados antes de integrarse.  
**Evidencia:** PR reviews, CODEOWNERS, static analysis.

### QA-SSDF-PW-004 — Pruebas de seguridad
**Regla:** El proyecto debe ejecutar pruebas de seguridad proporcionales a su superficie de ataque.  
**Evidencia:** SAST, DAST, pruebas de autorización, escaneo de dependencias.

## Responder a vulnerabilidades

### QA-SSDF-RV-001 — Registro de vulnerabilidades
**Regla:** Las vulnerabilidades detectadas deben registrarse, priorizarse y dar seguimiento hasta su resolución o aceptación formal del riesgo.  
**Evidencia:** issues de seguridad, tickets, severidad y estado.

### QA-SSDF-RV-002 — Aprendizaje posterior
**Regla:** Las vulnerabilidades relevantes corregidas deben generar medidas preventivas cuando sea razonable.  
**Evidencia:** nuevas pruebas, reglas SAST, actualización de guía o cambios de diseño.
