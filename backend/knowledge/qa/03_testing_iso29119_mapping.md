---
source: "ISO/IEC/IEEE 29119-1:2022 y serie 29119 - interpretación operativa"
version: "2022"
domain: "software_testing"
document_type: "reference_mapping"
official_url: "https://www.iso.org/standard/81291.html"
---

# Lineamientos operativos de pruebas de software

Este documento toma como referencia conceptual la serie ISO/IEC/IEEE 29119. No reproduce el contenido normativo.

## QA-TEST-001 — Estrategia de pruebas
**Prioridad:** Alta  
**Regla:** El proyecto debe definir qué niveles y tipos de prueba aplican según sus riesgos.  
**Evidencia:** estrategia o plan de pruebas, README QA, matriz de riesgos.

## QA-TEST-002 — Alcance identificable
**Prioridad:** Alta  
**Regla:** Debe ser posible determinar qué funcionalidades, componentes o requisitos están cubiertos por las pruebas.  
**Evidencia:** tags, nombres de pruebas, matriz de trazabilidad, suites o carpetas.

## QA-TEST-003 — Condiciones de prueba
**Prioridad:** Alta  
**Regla:** Los casos deben indicar las condiciones relevantes que se desean verificar.  
**Evidencia:** escenario, precondición, entrada y resultado esperado.

## QA-TEST-004 — Resultado esperado
**Prioridad:** Alta  
**Regla:** Toda prueba automatizada o caso formal debe disponer de un criterio observable para determinar éxito o fallo.  
**Evidencia:** assertions, expected values, status codes o reglas.

## QA-TEST-005 — Datos de prueba controlados
**Prioridad:** Media  
**Regla:** Los datos utilizados en pruebas deben ser reproducibles y no depender innecesariamente de información productiva real.  
**Evidencia:** fixtures, seeds, mocks, factories o datasets anonimizados.

## QA-TEST-006 — Independencia razonable
**Prioridad:** Media  
**Regla:** Una prueba no debe depender de efectos no documentados de otra prueba.  
**Evidencia:** setup/teardown, aislamiento, mocks, transacciones.

## QA-TEST-007 — Pruebas negativas
**Prioridad:** Alta  
**Regla:** Las entradas inválidas, permisos insuficientes y errores esperables deben ser probados cuando sean relevantes.  
**Evidencia:** tests 4xx/5xx, validadores, errores de dominio o accesos denegados.

## QA-TEST-008 — Regresión
**Prioridad:** Alta  
**Regla:** Los defectos corregidos relevantes deben convertirse, cuando sea viable, en pruebas que eviten su reaparición.  
**Evidencia:** test asociado al issue o commit de corrección.

## QA-TEST-009 — Integración
**Prioridad:** Alta  
**Regla:** Las interacciones críticas entre componentes deben validarse más allá de las pruebas unitarias.  
**Evidencia:** pruebas de API, base de datos, colas, storage o servicios externos simulados.

## QA-TEST-010 — Ejecución automatizada en CI
**Prioridad:** Alta  
**Regla:** Las pruebas repetibles y rápidas deben ejecutarse automáticamente antes o durante la integración de cambios.  
**Evidencia:** GitHub Actions, GitLab CI, Azure Pipelines, Jenkins u otro pipeline.

## QA-TEST-011 — Reporte de resultados
**Prioridad:** Media  
**Regla:** Debe conservarse evidencia suficiente de la ejecución de pruebas relevantes para una liberación.  
**Evidencia:** reporte CI, JUnit/XML, cobertura, logs o artefactos.

## QA-TEST-012 — Criterio de finalización
**Prioridad:** Alta  
**Regla:** El proyecto debe definir cuándo una ronda de pruebas se considera suficiente para permitir una liberación.  
**Evidencia:** quality gate, defectos máximos aceptados, cobertura mínima o aprobación QA.
