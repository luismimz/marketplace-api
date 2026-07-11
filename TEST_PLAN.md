# Test Plan (Inicial)

## Alcance

Cobertura mínima para nuevas funciones de email y seguridad básica de colas.

## Unit

1. EmailService.normalizeEmailType (legacy -> enum) [hecho]
2. EmailService.buildUnsubscribeHeaders genera ambos headers.
3. enqueueEmailJob aplica attempts/backoff y prioridad marketing.

## Integration (pendiente)

1. POST /email/send-template responde 400 si faltan replacements.
2. POST /email/send-template retorna jobId si OK.
3. GET /api/\_health/queues devuelve métricas esperadas.

## E2E (pendiente)

1. Flujo registro -> verify-email (simular PIN) -> login.
2. Reprocess permitido solo para CRITICAL.

## Futuras

- Test render variables placeholder.
- Simular fallo nodemailer y verificar log error.

## Notas

Se añadieron pruebas unitarias iniciales en `src/email/__tests__/email.service.spec.ts`.
