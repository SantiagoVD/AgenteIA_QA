---
source: "QA RAG Corpus v1 - política interna de ejemplo"
version: "1.0"
domain: "quality_assurance"
document_type: "internal_guideline"
---

# Política general de aseguramiento de calidad

## QA-GEN-001 — Trazabilidad de requisitos
**Prioridad:** Alta  
**Regla:** Cada funcionalidad implementada debe poder relacionarse con al menos un requisito, historia de usuario o criterio de aceptación identificable.  
**Evidencia esperada:** historias de usuario, tickets, matriz de trazabilidad, commits, pull requests o documentación funcional.  
**Cumple:** existe relación verificable entre requisito, implementación y validación.  
**No cumple:** existe funcionalidad sin origen o criterio de aceptación identificable.

## QA-GEN-002 — Criterios de aceptación verificables
**Prioridad:** Alta  
**Regla:** Los requisitos funcionales deben definir condiciones objetivas que permitan determinar si una funcionalidad fue aceptada.  
**Evidencia esperada:** Given/When/Then, criterios de aceptación, casos de prueba o reglas de negocio.  
**Cumple:** los criterios son observables y comprobables.  
**No cumple:** los criterios son vagos, subjetivos o inexistentes.

## QA-GEN-003 — Revisión antes de integración
**Prioridad:** Alta  
**Regla:** Los cambios relevantes de código deben pasar por una revisión antes de integrarse a la rama principal.  
**Evidencia esperada:** pull request, aprobación, comentarios de revisión o política de protección de ramas.  
**Cumple:** existe evidencia de revisión independiente o automatizada antes del merge.  
**No cumple:** los cambios se integran directamente sin control.

## QA-GEN-004 — Automatización de pruebas
**Prioridad:** Alta  
**Regla:** Las funcionalidades críticas deben disponer de pruebas automatizadas repetibles.  
**Evidencia esperada:** suites unitarias, integración, API, UI o pipeline CI.  
**Cumple:** existen pruebas ejecutables relacionadas con las funcionalidades críticas.  
**No cumple:** la validación depende únicamente de pruebas manuales.

## QA-GEN-005 — Ejecución reproducible
**Prioridad:** Alta  
**Regla:** El proyecto debe documentar cómo instalar dependencias, configurar el entorno y ejecutar la aplicación y sus pruebas.  
**Evidencia esperada:** README, scripts, contenedores, archivos de dependencias, variables de entorno documentadas.  
**Cumple:** un tercero puede reproducir la ejecución con instrucciones suficientes.  
**No cumple:** se requieren pasos no documentados o conocimiento tácito.

## QA-GEN-006 — Gestión de defectos
**Prioridad:** Media  
**Regla:** Los defectos detectados deben registrarse con información suficiente para reproducirlos y darles seguimiento.  
**Evidencia esperada:** issue, ticket, severidad, pasos de reproducción, estado y responsable.  
**Cumple:** existe trazabilidad del defecto hasta su resolución o aceptación del riesgo.  
**No cumple:** los defectos se corrigen informalmente sin registro.

## QA-GEN-007 — Clasificación de severidad
**Prioridad:** Media  
**Regla:** Los defectos deben clasificarse según su impacto y urgencia.  
**Evidencia esperada:** severidad, prioridad, SLA o reglas de clasificación.  
**Cumple:** la clasificación permite priorizar objetivamente la atención.  
**No cumple:** todos los defectos se gestionan sin diferenciación.

## QA-GEN-008 — Control de configuración
**Prioridad:** Alta  
**Regla:** Configuraciones sensibles y variables dependientes del entorno no deben quedar codificadas directamente en el código fuente.  
**Evidencia esperada:** variables de entorno, secret manager, configuración externa o plantillas `.env.example`.  
**Cumple:** secretos y configuración variable están externalizados.  
**No cumple:** contraseñas, tokens o endpoints sensibles están hardcodeados.

## QA-GEN-009 — Registro de errores
**Prioridad:** Alta  
**Regla:** Los errores relevantes deben registrarse con contexto suficiente para diagnóstico sin exponer información sensible.  
**Evidencia esperada:** logging estructurado, identificadores de correlación, manejo de excepciones.  
**Cumple:** los logs permiten diagnosticar fallos y evitan secretos o datos confidenciales.  
**No cumple:** los errores se silencian o se registran secretos.

## QA-GEN-010 — Validación de entradas
**Prioridad:** Alta  
**Regla:** Toda entrada proveniente de usuarios o sistemas externos debe validarse antes de ser procesada.  
**Evidencia esperada:** validadores, esquemas, contratos, límites, sanitización o manejo de errores.  
**Cumple:** las entradas inválidas son rechazadas de forma controlada.  
**No cumple:** datos arbitrarios llegan directamente a la lógica o persistencia.

## QA-GEN-011 — Documentación técnica mínima
**Prioridad:** Media  
**Regla:** El proyecto debe documentar propósito, arquitectura general, componentes principales, dependencias y forma de ejecución.  
**Evidencia esperada:** README, diagramas, ADR, documentación de API.  
**Cumple:** un desarrollador nuevo puede comprender la solución y comenzar a trabajar.  
**No cumple:** el conocimiento del sistema depende exclusivamente del equipo original.

## QA-GEN-012 — Gestión de versiones
**Prioridad:** Media  
**Regla:** Los entregables deben disponer de una versión identificable y de un historial de cambios relevante.  
**Evidencia esperada:** tags, releases, changelog o versionado del artefacto.  
**Cumple:** es posible identificar qué versión fue desplegada o evaluada.  
**No cumple:** no existe forma confiable de determinar la versión.

## QA-GEN-013 — Separación de ambientes
**Prioridad:** Alta  
**Regla:** Desarrollo, pruebas y producción deben diferenciarse cuando el nivel de riesgo del sistema lo justifique.  
**Evidencia esperada:** configuraciones independientes, cuentas/proyectos separados, pipelines o despliegues diferenciados.  
**Cumple:** las pruebas no comprometen datos o servicios productivos.  
**No cumple:** el desarrollo normal requiere modificar directamente producción.

## QA-GEN-014 — Criterios de salida
**Prioridad:** Alta  
**Regla:** Una versión debe cumplir criterios explícitos antes de considerarse apta para liberación.  
**Evidencia esperada:** quality gate, checklist, resultados de pruebas, vulnerabilidades abiertas y aprobación.  
**Cumple:** la liberación está respaldada por criterios verificables.  
**No cumple:** la decisión de liberar es puramente informal.

## QA-GEN-015 — Evidencia auditable
**Prioridad:** Alta  
**Regla:** Las afirmaciones de cumplimiento deben estar respaldadas por evidencia concreta y localizable.  
**Evidencia esperada:** archivo, línea de código, reporte, ejecución, log, ticket, captura o configuración.  
**Cumple:** la conclusión puede ser revisada por otra persona.  
**No cumple:** el cumplimiento se declara sin evidencia.
