# Tabuleiro do Empreendedor

Plataforma para alojar eventos/hackathons de emprendimiento por equipos. Ver `docs/architecture/README.md` para la arquitectura completa y `docs/architecture/DECISIONS-UX.md` para las correcciones de flujo frente al prototipo original (`tdoe/`, que se mantiene en disco solo como referencia y no forma parte de este repo).

## Requisitos

- Node 22+
- pnpm 12+ (`brew install pnpm`)

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Scripts

- `pnpm dev` — levanta `apps/web` en modo desarrollo
- `pnpm build` — build de producción (todo el monorepo vía Turborepo)
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm test:e2e`
- `pnpm db:generate` / `pnpm db:migrate` — Prisma sobre `packages/db`

## Equipo

- DevOps / infra / CI-CD: Brandon
- Frontend: JP
- Backend / base de datos: Eddy
- QA / testing: Leo
