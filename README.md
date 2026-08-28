# AgenteIA_QA

Plataforma local para analizar la calidad y el cumplimiento técnico de repositorios públicos de GitHub. AgenteIA_QA combina análisis estático, recuperación de lineamientos QA (RAG) y agentes especializados para producir un reporte trazable, con estados de cumplimiento y evidencia asociada a archivos y líneas del repositorio.

> AgenteIA_QA es una herramienta de apoyo a la revisión técnica. No emite certificaciones oficiales ISO, OWASP o NIST ni sustituye una auditoría profesional.

## Objetivo

Convertir un repositorio de software en un diagnóstico accionable:

1. Validar y clonar temporalmente un repositorio público de GitHub.
2. Identificar tecnologías, estructura, pruebas, CI/CD, infraestructura y señales de seguridad.
3. Indexar evidencia estática sanitizada y asociarla con rutas y líneas.
4. Recuperar lineamientos del corpus QA local mediante embeddings persistentes.
5. Evaluar el proyecto con agentes por dominio y consolidar un único reporte.

## Capacidades principales

- Evaluación por cuatro dominios: QA general, calidad del producto, testing y seguridad.
- Corpus local basado en los mapeos incorporados de ISO/IEC 25010, ISO/IEC/IEEE 29119, NIST SSDF, OWASP ASVS y OWASP WSTG.
- Evidencia trazable por archivo, rango de líneas y tipo de contenido.
- Estados `CUMPLE`, `CUMPLE_PARCIALMENTE`, `NO_CUMPLE`, `SIN_EVIDENCIA` y `NO_APLICA`.
- Métricas de cumplimiento verificado y cobertura de evidencia.
- Detección y enmascaramiento de posibles secretos antes de persistir evidencia.
- Enriquecimiento opcional con Ollama/Qwen; el análisis determinista funciona sin un modelo local.
- Interfaz web con progreso de análisis, filtros, hallazgos prioritarios y visor de evidencia.

## Arquitectura

```text
URL GitHub
   │
   ▼
Validador y clon temporal ──► Scanner ──► Profiler tecnológico
                                      │
                                      ▼
                           Project Evidence Store
                                      │
                                      ▼
                 QA RAG ──► Agentes especializados ──► Compliance Agent
                                                               │
                                                               ▼
                                                     Reporte y métricas
```

### Backend

- `src/repository`: validación de URLs, clonación aislada, escaneo y perfil tecnológico.
- `src/evidence`: creación de chunks sanitizados con rutas y líneas de origen.
- `src/qa`: carga del corpus, embeddings, recuperación, agentes y consolidación.
- `src/analysis`: orquestación del ciclo completo y persistencia temporal.
- `src/llm`: integración opcional con Ollama/Qwen mediante JSON estructurado.
- `src/api/analyses`: API HTTP para crear, consultar y revisar análisis.

### Frontend

La aplicación Next.js presenta el formulario de repositorio, el avance de cada fase, el perfil tecnológico, las métricas, los hallazgos filtrables y la evidencia sanitizada.

## Seguridad y límites operativos

El repositorio analizado se considera entrada no confiable. AgenteIA_QA:

- Solo acepta URLs HTTPS de repositorios públicos de GitHub.
- No ejecuta código, scripts, instalaciones de dependencias, builds, tests ni contenedores provenientes del repositorio.
- Ignora directorios generados o de dependencias como `.git`, `node_modules`, `dist`, `build`, `coverage` y `.next`.
- Limita el número de archivos y el tamaño total analizado.
- Elimina el workspace clonado al finalizar el análisis.
- No persiste valores completos que sean identificados como posibles secretos.

La ausencia de evidencia se reporta como `SIN_EVIDENCIA`; no se convierte automáticamente en incumplimiento.

## Requisitos

- Node.js 24 o superior.
- Git disponible en el `PATH`.
- Windows, macOS o Linux.
- Ollama es opcional para el enriquecimiento con IA local.

## Instalación y ejecución

Desde la raíz del proyecto:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local

cd backend
npm install
npm run ingest
npm run dev
```

En una segunda terminal:

```powershell
cd frontend
npm install
npm run dev
```

Aplicación web: `http://localhost:3000`  
API: `http://localhost:3001`

Para habilitar el enriquecimiento con el modelo local:

```powershell
ollama serve
ollama pull qwen3-vl:4b
```

Después, establece `QA_USE_OLLAMA=true` en `backend/.env`. Si Ollama no está disponible, el backend conserva el flujo determinista.

## Ingesta del corpus QA

El corpus fuente está en `backend/knowledge/qa`. La ingesta se ejecuta con:

```powershell
cd backend
npm run ingest
```

El índice generado se guarda en `backend/data/qa-vector-store.json`, que es un artefacto local regenerable y está excluido del control de versiones.

## API

### Crear análisis

`POST /api/analyses`

```json
{
  "repositoryUrl": "https://github.com/usuario/repositorio-publico"
}
```

La respuesta devuelve un `analysisId` y el estado inicial. El cliente puede consultar el progreso en:

`GET /api/analyses/:analysisId`

Cuando finaliza, el reporte completo está disponible en:

`GET /api/analyses/:analysisId/report`

La evidencia sanitizada se consulta mediante:

`GET /api/analyses/:analysisId/evidence?path=src/index.ts`

## Métricas

El `Verified Compliance Score` excluye los estados `SIN_EVIDENCIA` y `NO_APLICA`:

```text
(CUMPLE + 0.5 × CUMPLE_PARCIALMENTE)
──────────────────────────────────── × 100
(CUMPLE + CUMPLE_PARCIALMENTE + NO_CUMPLE)
```

`Evidence Coverage` indica qué proporción de lineamientos aplicables obtuvo un resultado verificable con evidencia del proyecto.

## Validación del proyecto

```powershell
cd backend
npm run build
npm test
npm run ingest

cd ../frontend
npm run lint
npm run build
```

## Estructura del repositorio

```text
AgenteIA_QA/
├── backend/
│   ├── knowledge/qa/       # Corpus QA versionado
│   ├── scripts/             # Ingesta del corpus
│   ├── src/                 # API, análisis, RAG y agentes
│   └── tests/               # Pruebas unitarias y de integración local
├── frontend/
│   └── src/                 # Aplicación Next.js
├── .gitignore
├── package.json
└── README.md
```

## Roadmap

- Persistencia multiusuario e historial de análisis.
- Autenticación y autorización de acceso.
- Análisis de dependencias y vulnerabilidades con herramientas especializadas.
- Ejecución opcional y aislada de pruebas dentro de un sandbox explícitamente habilitado.
- Exportación de reportes y trazabilidad de revisiones.
