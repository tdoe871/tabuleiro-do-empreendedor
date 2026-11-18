# Estado de la base de datos — Tabuleiro do Empreendedor

> Complemento a `docs/backend/ESTADO-BACKEND.md` sección 4 (que sigue siendo la referencia del
> esquema y las migraciones, responsable: Eddy). Este documento cubre lo que cambió o se verificó
> del lado de infraestructura de la base **entre el 11 y 12 de noviembre de 2026** (responsable:
> Brandon, con Claude como par de trabajo). Documentación pura — no cambia el esquema.

---

## 1. Resumen

- **No hubo migraciones nuevas esta semana.** Los dos fixes del 11-12 nov (puntos por fase, quitar
  mentor) usan tablas y columnas que ya existían (`Team.score`, `Mentor`, `Evaluation`); ninguno
  tocó `schema.prisma`.
- El proyecto de Supabase (`tlxvxcukcxklecyljysk`, us-east-1) está en el tier de cómputo
  **Small** (confirmado en el panel, Settings → Infrastructure, el 12 nov): **14 de 90** conexiones
  directas en uso, CPU 5%, memoria 55%, disco 16%. `ESTADO-BACKEND.md` (10 nov) advertía que el
  plan Free solo aceptaba 200 conexiones vivas y que el evento necesitaba Pro — el proyecto ya está
  en un tier pago por encima de Free.
- `DATABASE_POOL_MAX` sigue sin confirmarse su valor exacto en Vercel Production (variable
  enmascarada; revelarla exige un código de verificación por correo que no se usó esta noche por
  no ser necesario). En local no está fijada, así que usa el default de la app: **5** por instancia
  (`poolMax()` en `packages/db/src/index.ts`).

## 2. Higiene de datos de prueba

Regla que ya existía y se mantuvo: **nunca se escribe en la base con SQL directo**, solo con el
cliente de Prisma, y toda prueba en vivo contra la base real crea sus propios datos y los borra al
terminar.

- Las pruebas automatizadas con `E2E_DB=1` crean cuentas/eventos marcados `@e2e.test` /
  `E2E-` y los borra automáticamente antes y después de cada corrida
  (`e2e-tests/support/cleanup.ts`).
- La prueba manual en vivo del 12 nov (verificar que "quitar mentor" funciona de punta a punta
  contra la base real) creó una cuenta de prueba (`bpedrazavaldez@gmail.com` / "Brandon Test"), un
  evento ("Sesion Prueba QA Final") y un equipo ("Equipo Final QA"). **Se borraron los tres
  manualmente al terminar la prueba** (evento primero, por la llave foránea `Event.hostId`, luego
  la cuenta), confirmado con una consulta posterior que no regresó resultados.

## 3. Lo que sigue pendiente (sin cambios desde `ESTADO-BACKEND.md` sección 8.5/8.6)

- Limpiar los datos de la semana del 8 nov (`QATEST`, `WDAFL7`, `FVR7SM` y sus cuentas) — pendiente,
  responsable Eddy.
- Auditoría de seguridad de la base (RLS, advisor de Supabase) — pendiente, responsable Eddy.
- **Nunca se probó la base bajo la carga real de 300-500 personas entrando al mismo tiempo** con la
  configuración de hoy (tier Small + el `DATABASE_POOL_MAX` actual de Vercel). La única prueba de
  carga que existe es la del 8 nov, corrida desde una máquina local contra Supabase directamente,
  no contra el hosting de producción. Ver `docs/testing/QA-2026-11-12.md` sección 5 y
  `docs/hosting/ESTADO-HOSTING.md` sección 7.
