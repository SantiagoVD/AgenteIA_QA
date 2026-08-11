# Backend

Backend Node.js y TypeScript de Architecture Multi-Agent. La documentación completa de instalación, arquitectura, API y solución de problemas se encuentra en el [README principal](../README.md).

## Responsabilidades

- Exponer `POST /api/chat`.
- Procesar imágenes, PDF y archivos de texto.
- Analizar diagramas una sola vez mediante Qwen Vision y OCR.
- Seleccionar de forma determinista uno, dos o tres especialistas.
- Guiar consultas ambiguas y conservar su contexto durante el levantamiento de requisitos.
- Ejecutar secuencialmente únicamente los agentes seleccionados.
- Recuperar reglas desde los RAG aislados de Cloud, Integración e Infraestructura.
- Consolidar resultados y registrar trazabilidad por `requestId`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm test
npm run ingest
npm run fixtures
npm run test:e2e
```

El backend utiliza las variables documentadas en `.env.example` y requiere Ollama con `qwen3-vl:4b` disponible.
