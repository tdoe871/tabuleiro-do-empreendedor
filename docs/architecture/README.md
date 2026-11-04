# Arquitectura — Tabuleiro do Empreendedor

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend/Backend**: Next.js 16 (App Router) + React 19 + TypeScript — un solo deploy, sin servicio NestJS separado
- **DB**: PostgreSQL alojado en Supabase, acceso vía Prisma (`packages/db`)
- **Auth**: sesiones JWT propias con `jose` (mismo patrón que Maestro-virtual), no NextAuth
- **Realtime**: Supabase Realtime (canales de Postgres) para timer/leaderboard en vivo — no se necesita un gateway de WebSockets propio
- **i18n**: `next-intl`, 4 idiomas obligatorios: `pt-BR` (default), `es`, `en`, `fr`
- **Estilos**: Tailwind CSS v4
- **Testing**: Jest + Testing Library (unit), Playwright (e2e)
- **Calidad**: Husky + lint-staged + ESLint
- **CI**: GitHub Actions (`lint`, `typecheck`, `test`, `build`)
- **Hosting**: Vercel (Hobby esta semana → Pro antes del evento) + Supabase (Free esta semana → Pro antes del evento). Ambos upgrades son solo un cambio de plan sobre el mismo proyecto, sin migración.

## Por qué no NestJS

Vercel ejecuta funciones serverless con timeout máximo de 60s en Hobby — no hay proceso persistente donde vivir un Nest Gateway de WebSockets. Montar NestJS real exigiría un segundo host siempre encendido (Railway/Fly), segundo pipeline de CI/CD y segundo set de variables de entorno: presupuesto de tiempo que no hay en una semana. El timer en vivo y el leaderboard se resuelven con Supabase Realtime desde el cliente.

## Estructura

```
apps/web/            Next.js app (único deployable)
  src/app/            rutas (App Router), incluye api/ (route handlers)
  src/features/       lógica por dominio (event, team, auth, timer, submission, communication, leaderboard)
  src/components/     ui, layout, forms, shared, providers
  src/lib/            auth, realtime, utils, validations, constants, logger
  src/services/       clientes de api/realtime
  src/i18n/           next-intl: routing, navigation, request, dictionaries/
packages/db/          Prisma schema + cliente compartido (@tdoe/db)
packages/config/      tsconfig/eslint compartidos (@tdoe/config)
```

## Modelo de datos

Ver `packages/db/prisma/schema.prisma`. Traducido del backend FastAPI/Supabase que ya existía en `tdoe/tdoe_app.py` (tablas `sessoes`, `equipes`, `participantes`, `progresso_fases`, `progresso_chaves`, `alertas`), simplificado para la primera semana: se deja fuera el subsistema de comunicación (`cutucar`/`sussurros`/`baloes_coletivos`) y los roles RPG completos — quedó `Participant.rpgRole` como campo opcional simple, por si se reintroduce después del hackathon.

Cambios de modelo que resuelven los 3 problemas de UX encontrados en el prototipo — ver `docs/architecture/DECISIONS-UX.md`.
