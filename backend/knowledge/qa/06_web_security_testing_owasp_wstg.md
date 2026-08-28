---
source: "OWASP Web Security Testing Guide 4.2 - mapeo de pruebas"
version: "4.2"
domain: "web_security_testing"
document_type: "test_guideline"
official_url: "https://owasp.org/www-project-web-security-testing-guide/v42/"
license_reference: "OWASP project content is published under CC BY-SA 4.0"
---

# Pruebas de seguridad web para el agente QA

## QA-WSTG-001 — Superficie de ataque
**Objetivo:** Identificar rutas, endpoints, servicios y puntos de entrada expuestos.  
**Evidencia:** rutas, OpenAPI, frontend calls, reverse proxy, infraestructura.

## QA-WSTG-002 — Exposición de información
**Objetivo:** Detectar información técnica o sensible expuesta innecesariamente.  
**Evidencia:** headers, errores, comentarios, archivos públicos, logs cliente.

## QA-WSTG-003 — Configuración de seguridad
**Objetivo:** Revisar configuraciones que puedan debilitar la aplicación.  
**Evidencia:** CORS, headers, debug mode, permisos, puertos, storage público.

## QA-WSTG-004 — Registro y autenticación
**Objetivo:** Verificar que el acceso a cuentas esté correctamente protegido.  
**Evidencia:** login, recuperación, MFA cuando aplique, rate limits.

## QA-WSTG-005 — Gestión de sesión
**Objetivo:** Verificar expiración, invalidación y protección de sesiones/tokens.  
**Evidencia:** cookies, JWT, refresh, logout.

## QA-WSTG-006 — Autorización
**Objetivo:** Comprobar que un usuario no puede acceder a datos o acciones fuera de sus permisos.  
**Evidencia:** pruebas negativas, ownership checks, roles.

## QA-WSTG-007 — Validación de entradas
**Objetivo:** Verificar el comportamiento ante entradas manipuladas o fuera de contrato.  
**Evidencia:** pruebas de validación, payloads inválidos, límites.

## QA-WSTG-008 — Manejo de errores
**Objetivo:** Confirmar que los errores son controlados y no filtran información sensible.  
**Evidencia:** respuestas API, páginas de error, logs.

## QA-WSTG-009 — Criptografía y transporte
**Objetivo:** Revisar el uso de TLS y la protección de información sensible.  
**Evidencia:** HTTPS, certificados, cookies secure, cifrado.

## QA-WSTG-010 — Lógica de negocio
**Objetivo:** Identificar maneras de saltar el flujo esperado del negocio.  
**Evidencia:** secuencias, estados, límites, doble envío, modificación de parámetros.

## QA-WSTG-011 — Cliente
**Objetivo:** Revisar riesgos derivados del código ejecutado en navegador.  
**Evidencia:** manejo de DOM, almacenamiento local, tokens, CSP.

## QA-WSTG-012 — API
**Objetivo:** Verificar autenticación, autorización, validación, límites y manejo de errores en endpoints.  
**Evidencia:** OpenAPI, middleware, pruebas y responses.
