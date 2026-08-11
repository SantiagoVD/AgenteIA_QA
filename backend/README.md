# Architecture Multi-Agent

Backend local con tres especialistas RAG aislados (Cloud, Integración e Infraestructura) y un Orchestrator.

## Modos

- `DESIGN`: consultas sin imagen. Conserva el flujo de recomendación arquitectónica.
- `VALIDATION`: se activa por defecto con una imagen. Vision se ejecuta exactamente una vez; el mismo JSON visual se entrega a los tres especialistas mediante `Promise.all()`.

En validación, cada agente recupera únicamente reglas de su PDF y emite findings tipados: `COMPLIANT`, `NON_COMPLIANT`, `NOT_EVIDENT` o `NOT_APPLICABLE`. Los lineamientos representan requisitos y nunca se tratan como evidencia de implementación.

El estado general se calcula de forma determinista:

- `NON_COMPLIANT`: existe al menos un incumplimiento `CRITICAL` o `HIGH`.
- `PARTIAL_COMPLIANCE`: existen cumplimientos e incumplimientos sin el criterio anterior.
- `COMPLIANT`: hay evidencia de cumplimiento y ningún incumplimiento confirmado.
- `INCONCLUSIVE`: predomina la falta de evidencia o no hay reglas suficientes.

## Ejecución

```powershell
ollama pull qwen3-vl:4b
cd backend
npm install
npm run start
```

Backend: `http://localhost:3001`. Frontend: `http://localhost:3000`.

## Comandos de verificación

```powershell
npm run build
npm test
npm run ingest
npm run fixtures
npm run test:e2e
```

## Configuración y diagnóstico

Variables principales: `PORT`, `OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL`, `MAX_ARCHITECTURE_IMAGE_MB`, `VALIDATION_TOP_K_PER_QUERY`, `VALIDATION_RULE_LIMIT` y `ARCHITECTURE_VALIDATION_DEBUG`.

Con debug activo se registran requestId, modo, metadata segura del archivo, duración de Vision, componentes, consultas RAG resumidas, ruleId, estados por agente y duración total. No se registra Base64, imagen completa, prompts completos ni secretos.

Logs: `../logs/application.log` y `../logs/error.log`.
