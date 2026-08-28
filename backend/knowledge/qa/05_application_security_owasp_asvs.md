---
source: "OWASP ASVS 5.0.0 - mapeo temático original"
version: "5.0.0"
domain: "application_security"
document_type: "reference_mapping"
official_url: "https://owasp.org/www-project-application-security-verification-standard/"
license_reference: "OWASP project content is published under CC BY-SA 4.0"
---

# Controles de seguridad de aplicación inspirados en OWASP ASVS 5.0.0

Los IDs `QA-ASVS-*` son propios de este corpus y no sustituyen los identificadores oficiales de ASVS.

## QA-ASVS-001 — Validación de datos
**Prioridad:** Crítica  
**Regla:** Las entradas no confiables deben validarse por tipo, longitud, formato y rango cuando aplique.  
**Evidencia:** schemas, validators, DTO validation, sanitización.

## QA-ASVS-002 — Prevención de inyección
**Prioridad:** Crítica  
**Regla:** El acceso a bases de datos y otros intérpretes debe evitar concatenar entrada no confiable dentro de comandos ejecutables.  
**Evidencia:** consultas parametrizadas, ORM seguro, prepared statements.

## QA-ASVS-003 — Autenticación
**Prioridad:** Crítica  
**Regla:** Los recursos protegidos deben exigir una identidad autenticada mediante mecanismos adecuados al riesgo.  
**Evidencia:** middleware, tokens, sesiones o identity provider.

## QA-ASVS-004 — Autorización del lado servidor
**Prioridad:** Crítica  
**Regla:** Las decisiones de autorización deben verificarse en el servidor para cada operación protegida.  
**Evidencia:** policies, roles, guards, ownership checks.

## QA-ASVS-005 — Principio de mínimo privilegio
**Prioridad:** Alta  
**Regla:** Usuarios, servicios y componentes deben recibir únicamente los permisos necesarios.  
**Evidencia:** IAM, scopes, roles, permisos de BD.

## QA-ASVS-006 — Gestión segura de sesión
**Prioridad:** Alta  
**Regla:** Las sesiones o tokens deben disponer de expiración y mecanismos adecuados de invalidación o renovación.  
**Evidencia:** expiración JWT, cookies seguras, refresh token, revocación.

## QA-ASVS-007 — Credenciales protegidas
**Prioridad:** Crítica  
**Regla:** Las contraseñas no deben almacenarse de forma reversible ni registrarse en logs.  
**Evidencia:** algoritmos de hash adaptativos, configuración de identidad.

## QA-ASVS-008 — Protección criptográfica
**Prioridad:** Alta  
**Regla:** Las operaciones criptográficas deben usar bibliotecas y algoritmos modernos, evitando implementaciones criptográficas caseras.  
**Evidencia:** librerías estándar, TLS, configuración criptográfica.

## QA-ASVS-009 — Manejo de errores
**Prioridad:** Alta  
**Regla:** Las respuestas de error no deben revelar secretos, trazas internas o detalles innecesarios de infraestructura a usuarios finales.  
**Evidencia:** exception handlers, respuestas genéricas, logs internos.

## QA-ASVS-010 — Logging de eventos de seguridad
**Prioridad:** Alta  
**Regla:** Eventos relevantes de autenticación, autorización y acciones críticas deben ser auditables.  
**Evidencia:** audit logs, security logs, correlation IDs.

## QA-ASVS-011 — Seguridad de archivos
**Prioridad:** Alta  
**Regla:** Las cargas de archivos deben restringir tipo, tamaño, nombre y destino, y almacenarse evitando ejecución no autorizada.  
**Evidencia:** allowlists, tamaño máximo, renombrado, storage aislado.

## QA-ASVS-012 — CORS y orígenes
**Prioridad:** Alta  
**Regla:** Las políticas de origen cruzado deben limitarse a orígenes y métodos realmente necesarios.  
**Evidencia:** configuración CORS, allowlist.

## QA-ASVS-013 — Dependencias vulnerables
**Prioridad:** Alta  
**Regla:** El proyecto debe identificar y gestionar vulnerabilidades conocidas en componentes de terceros.  
**Evidencia:** SCA, lockfiles, alertas, SBOM.

## QA-ASVS-014 — Transporte seguro
**Prioridad:** Crítica  
**Regla:** Las comunicaciones que transporten credenciales o información sensible deben usar canales cifrados.  
**Evidencia:** HTTPS/TLS, políticas de redirect o configuración del proxy.

## QA-ASVS-015 — Protección frente a abuso
**Prioridad:** Media  
**Regla:** Los endpoints susceptibles a automatización abusiva deben disponer de controles proporcionales al riesgo.  
**Evidencia:** rate limiting, lockout, captcha contextual, cuotas.
