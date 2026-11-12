# Registro de Pull Requests — semana del 11-12 de noviembre de 2026

> Un documento por PR de esta semana (responsable: Brandon, con Claude como par de trabajo), para
> poder justificar qué se hizo, por qué y cómo se probó cada uno. Documentación pura — no cambia
> código de producto. Para el estado general ver `docs/frontend/`, `docs/backend/`,
> `docs/hosting/`, `docs/database/` y `docs/testing/QA-2026-11-12.md`.

| PR  | Rama                                 | Base   | Estado                                           | Fecha (mergeado) | Documento           |
| --- | ------------------------------------ | ------ | ------------------------------------------------ | ---------------- | ------------------- |
| #26 | `fix/submission-toast-and-copy-link` | `dev`  | Merged                                           | 11 nov 15:47 UTC | [PR-26](./PR-26.md) |
| #27 | `feature/domain-resend-mobile`       | `dev`  | Merged                                           | 12 nov 05:00 UTC | [PR-27](./PR-27.md) |
| #28 | `fix/qa-mobile-inputs-and-e2e`       | `dev`  | Merged                                           | 12 nov 05:19 UTC | [PR-28](./PR-28.md) |
| #29 | `dev`                                | `qa`   | **Cerrado sin mergear** (conflicto de historial) | —                | [PR-29](./PR-29.md) |
| #30 | `sync/dev-into-qa`                   | `qa`   | Merged                                           | 12 nov 05:26 UTC | [PR-30](./PR-30.md) |
| #31 | `qa`                                 | `main` | Merged (release)                                 | 12 nov 05:33 UTC | [PR-31](./PR-31.md) |
| #32 | `fix/phase-points-value`             | `dev`  | Merged                                           | 12 nov 06:19 UTC | [PR-32](./PR-32.md) |
| #33 | `feat/mentor-removal`                | `dev`  | Merged                                           | 12 nov 07:03 UTC | [PR-33](./PR-33.md) |
| #34 | `dev`                                | `qa`   | **Cerrado sin mergear** (mismo problema que #29) | —                | [PR-34](./PR-34.md) |
| #35 | `sync/dev-into-qa-2`                 | `qa`   | Merged                                           | 12 nov 07:11 UTC | [PR-35](./PR-35.md) |
| #36 | `qa`                                 | `main` | Merged (release)                                 | 12 nov 07:37 UTC | [PR-36](./PR-36.md) |
| #37 | `sync/main-into-qa`                  | `qa`   | Merged                                           | 12 nov 07:33 UTC | [PR-37](./PR-37.md) |

Los PR #29 y #34 se cerraron sin mergear porque GitHub marcó conflicto entre ramas que en el fondo
tenían el mismo contenido (ver `docs/hosting/ESTADO-HOSTING.md` sección 6); cada uno se resolvió
abriendo un PR nuevo (#30 y #35 respectivamente) con el conflicto resuelto a mano.

Todos los PRs a `main` (#31, #36) y a `qa` (#30, #35, #37) pasaron por aprobación de alguien
distinto al autor (requisito de la rama protegida) y los 4 checks de CI (`Lint`, `Typecheck`, `Unit
tests`, `Build`) en verde antes de mergear.
