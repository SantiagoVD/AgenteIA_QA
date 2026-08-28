---
source: "QA RAG Corpus v1 - modelo de decisión"
version: "1.0"
domain: "compliance_evaluation"
document_type: "decision_policy"
---

# Modelo de evidencia y cumplimiento

Este documento define cómo debe razonar el agente al clasificar un lineamiento.

## Estados

### CUMPLE
Usar únicamente cuando exista evidencia concreta que demuestre el control solicitado.

Ejemplo:
- Lineamiento: las consultas deben parametrizar datos no confiables.
- Evidencia: uso verificable de parámetros u ORM que no concatena la entrada.
- Resultado: CUMPLE.

### CUMPLE_PARCIALMENTE
Usar cuando el control existe, pero:
- no cubre todos los componentes aplicables;
- tiene excepciones relevantes;
- la configuración es incompleta;
- la evidencia solo demuestra parte del requisito.

### NO_CUMPLE
Usar cuando exista evidencia positiva de una práctica contraria al lineamiento.

Ejemplo:
- secreto hardcodeado en código;
- endpoint protegido sin autorización;
- concatenación directa de entrada en una consulta.

### SIN_EVIDENCIA
Usar cuando el repositorio o material analizado no contenga información suficiente.

Regla fundamental:
**Ausencia de evidencia no equivale automáticamente a incumplimiento.**

### NO_APLICA
Usar cuando el lineamiento no corresponda al tipo de sistema, tecnología o alcance evaluado.

## Jerarquía de evidencia

De mayor a menor fuerza:

1. Código o configuración directamente inspeccionable.
2. Prueba automatizada ejecutable.
3. Resultado de pipeline o reporte técnico.
4. Infraestructura como código.
5. Documentación técnica mantenida junto al código.
6. Ticket, historia o criterio de aceptación.
7. Declaración textual sin evidencia verificable.

## Confianza

### Alta
Evidencia directa, inequívoca y suficiente.

### Media
Evidencia parcial o inferencia técnica razonable con pocos supuestos.

### Baja
Información indirecta, documentación posiblemente desactualizada o inferencia con varios supuestos.

## Regla contra alucinaciones
El agente no debe inventar archivos, líneas, configuraciones, resultados de pruebas ni controles que no aparezcan en el material suministrado.

## Regla de conflicto
Si la documentación afirma que existe un control pero el código demuestra lo contrario, debe prevalecer la evidencia técnica directa y el conflicto debe indicarse.

## Formato recomendado de salida

```json
{
  "guideline_id": "QA-GEN-008",
  "status": "NO_CUMPLE",
  "confidence": "HIGH",
  "evidence": [
    {
      "type": "source_code",
      "location": "src/config.ts:14",
      "description": "Token almacenado directamente en código."
    }
  ],
  "reasoning_summary": "La configuración contiene un secreto directamente en el repositorio.",
  "recommendation": "Mover el secreto a un gestor de secretos o variable de entorno."
}
```
