# Estado del backend — Tabuleiro do Empreendedor

> Bitácora del backend y la base de datos (responsable: Eddy). Dice **qué está hecho, dónde está,
> cómo se trabaja y qué sigue**, para que cualquiera (o Claude en una sesión nueva) retome sin
> perder el hilo. Última actualización: **10 nov 2026**.
>
> Documentos relacionados:
>
> - `docs/backend/api.md` — **contrato de la API** (qué recibe y devuelve cada endpoint). Es la
>   referencia para el frontend.
> - `docs/architecture/README.md` y `docs/architecture/DECISIONS-UX.md` — decisiones de arquitectura
>   del equipo.
> - `docs/architecture/backend/CONTEXTO-BACKEND.md` — contexto inicial del backend. **Ojo: hoy solo
>   existe en la máquina de Eddy (no está en git).**

---

## 1. Resumen en 30 segundos

- Plataforma del LATAM Social Business Hackathon (Monterrey, **12-13 nov 2026**, 24 h, **~350
  participantes**, ~60 equipos de 2 a 5). Martes 10 y miércoles 11 QA, jueves 12 el evento.
- Un solo deploy de Next.js 16 (API en route handlers) + Prisma 7 sobre Postgres de Supabase.
- **El backend del alcance acordado está terminado, probado contra Supabase real y en `dev`:**
  cuentas del educador (con recuperar contraseña), sesiones del evento, equipos y jugadores, tablero
  con avance automático, entregas con links y archivos, chat del equipo, tiempo real, mentores y
  calificación, controles del educador (timer, carta de reto, alertas, exportar), avisos generales,
  interruptores de emergencia, registro de actividad y prueba de carga local (300 personas, 0
  errores).
- **El frontend ya llama a todo el backend** (PR #18 de Brandon, 10 nov).
- **Lo que falta para el evento** (detalle en la sección 8):
  1. **QA de Leo sobre `dev`** y luego el PR `dev` → `main`. El deploy de Vercel
     (`https://tabuleiro-do-empreendedor.vercel.app`) sirve `main`, que **todavía no tiene el
     backend**.
  2. **Planes:** Vercel Pro y Supabase Pro (Free solo acepta 200 conexiones en vivo).
  3. **Prueba de carga contra producción**, prueba en el wifi del lugar, limpiar la base y auditoría
     de seguridad.
  4. **Sin correos en producción** (no hay dominio en Resend): las contraseñas olvidadas se cambian
     con `pnpm staff:password` (sección 6).

---

## 2. Dónde estamos ahora (git y PRs)

| PR  | Rama                            | Base  | Estado           | Contenido                                                                                         |
| --- | ------------------------------- | ----- | ---------------- | ------------------------------------------------------------------------------------------------- |
| #2  | `feature/backend-base`          | `dev` | **Merged**       | `prisma.config.ts`, Prisma fijo en 7.10.1, 3 migraciones, seed, borrador del contrato             |
| #3  | `feature/staff-auth`            | `dev` | **Merged**       | Bloque del educador: login/registro/logout, eventos, correos (Resend), nombre de la llave pública |
| #7  | `feature/players`               | `dev` | **Merged**       | Jugadores, entregas, chat y tiempo real; con #11 a #17 dentro (merge en cascada, 10 nov)          |
| #11 | `feature/mentors`               | (#7)  | **Merged**       | Mentores y calificación                                                                           |
| #12 | `feature/educator-controls`     | (#7)  | **Merged**       | Timer de actividad, carta de reto, alertas y exportar                                             |
| #13 | `feature/load-test`             | (#7)  | **Merged**       | Prueba de carga, pool configurable y espera de transacciones                                      |
| #14 | `feature/announcements`         | (#7)  | **Merged**       | Avisos generales del educador a todo el evento                                                    |
| #15 | `feature/emergency-switches`    | (#7)  | **Merged**       | Interruptores de emergencia: apagar chat, entregas o entradas                                     |
| #16 | `feature/activity-log`          | (#7)  | **Merged**       | Registro de actividad para la investigación, con CSV                                              |
| #17 | `feature/password-reset`        | (#7)  | **Merged**       | Recuperar la contraseña del educador por correo                                                   |
| #18 | `feat/connect-frontend-...`     | `dev` | Merged (Brandon) | Frontend conectado a todos los bloques; sube el límite de entradas por IP de 300 a 500            |
| #19 | `feature/staff-password-script` | `dev` | **Abierto**      | Script para darle una contraseña nueva a un educador sin correo (`pnpm staff:password`)           |
| #6  | `ui/theme-sandbox-test`         | `dev` | Merged (JP)      | Frontend: diseño nuevo + conexión real del panel del educador y login                             |
| #5  | `test/initial-tests`            | `qa`  | Merged (Leo)     | Pruebas iniciales (unitarias, contrato y E2E)                                                     |

- **Todo el backend está en `dev`.** `main` sigue en el PR #1 (4 nov) y es lo que despliega Vercel.
- **Eddy no aprueba ni hace merge de sus propios PRs (ni Claude por él).**
- La carpeta principal (`tabuleiro-do-empreendedor`) trabaja sobre `dev`. Ya no hacen falta
  `local/prueba` ni el `git worktree` de `../tabuleiro-chat`, que tienen copias viejas.
- Archivos locales **sin versionar** (a propósito): `.mcp.json` (config del MCP de Supabase) y
  `docs/architecture/backend/` (contexto inicial).
- **Forma de trabajo acordada:** **un PR por bloque grande** (educador, jugadores, entregas, ...),
  no uno por cada tarea chica. Cada PR nuevo sale de `dev`, o del PR anterior si todavía no entra.

---

## 3. Entorno local

### Requisitos

- **Node 22** con nvm (`.nvmrc` dice 22). Eddy tiene Node 25 por defecto; Node 25 **no trae
  corepack**, así que `pnpm` y el hook de husky fallan con `pnpm: command not found`. Solución:
  `nvm use` en cada terminal, o `nvm alias default 22` una vez.
- **pnpm 12.16.1** con corepack (`corepack enable`; lo fija `packageManager` en `package.json`).

### Variables de entorno

Un solo archivo: **`apps/web/.env`** (ignorado por git; la plantilla es `apps/web/.env.example`).
`packages/db/prisma.config.ts` lo carga solo cuando existe.

| Variable                               | Para qué                                 | Notas                                                                                                                        |
| -------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | La app (Prisma con `@prisma/adapter-pg`) | Pooler de transacción, puerto **6543**                                                                                       |
| `DIRECT_URL`                           | Solo migraciones (CLI de Prisma)         | Pooler de sesión, puerto **5432** (las migraciones necesitan locks que el 6543 no soporta)                                   |
| `AUTH_SECRET`                          | Firmar sesiones (jose)                   | Mínimo 32 caracteres                                                                                                         |
| `NEXT_PUBLIC_APP_URL`                  | URL base                                 | `http://localhost:3000` en local. En producción `https://tabuleiro-do-empreendedor.vercel.app` (sin `/en` ni `/` final)      |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto Supabase                |                                                                                                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Llave pública (`sb_publishable_…`)       | La recibe el navegador para escuchar el tiempo real. Antes se llamaba `..._ANON_KEY`; se unificó el nombre                   |
| `SUPABASE_SECRET_KEY`                  | Storage y tiempo real desde el servidor  | **Solo servidor**, se salta RLS. Necesaria para archivos y para mandar avisos en vivo                                        |
| `DATABASE_POOL_MAX`                    | Conexiones a la base por instancia       | Opcional (5). Vercel: 3-5. Una VM: 10-20                                                                                     |
| `RESEND_API_KEY`, `MAIL_FROM`          | Correos                                  | Opcionales en local (sin ellas, el correo se imprime en la terminal). En producción, necesarias para recuperar la contraseña |
| `REALTIME_PROVIDER`                    | Tiempo real: `supabase` o `none`         | Opcional. Vacía: Supabase si existen las llaves, si no solo refresco                                                         |

- Eddy ya pasó su `.env` al equipo.
- **Brandon:** en GitHub (secrets del CI) y en Vercel, los nombres tienen que ser **exactamente** los
  de `.env.example`. Hoy GitHub solo tiene `AUTH_SECRET`; Vercel necesita al menos `DATABASE_URL`,
  `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY`.

### Comandos

```bash
nvm use                                   # Node 22
pnpm install
pnpm db:generate                          # genera el cliente de Prisma (no toca la base)
pnpm --filter @tdoe/db exec prisma migrate status   # qué migraciones faltan (solo lectura)
pnpm --filter @tdoe/db exec prisma migrate deploy   # aplica migraciones pendientes
pnpm db:seed                              # evento de prueba QATEST (se puede correr varias veces)
pnpm staff:password --list                # cuentas de educador (sección 6)
pnpm dev                                  # app en localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Problemas conocidos

- **En la red de la escuela no hay conexión a la base**: abre los puertos 5432/6543 pero corta el
  cifrado (TLS). Las migraciones y las pruebas en vivo se hacen desde casa. Se puede escribir código
  sin base.
- `next dev`/`next build` reescriben `apps/web/next-env.d.ts`; no se sube ese cambio
  (`git checkout -- apps/web/next-env.d.ts`).
- pnpm muestra "Agent skills awaiting approval: dotenv": no se aprobó y no hace falta.

---

## 4. Base de datos (Supabase)

- Proyecto: ref **`tlxvxcukcxklecyljysk`** (`https://tlxvxcukcxklecyljysk.supabase.co`), región
  us-east-1. Hay **un solo proyecto**: es también la base del evento.
- Esquema: `packages/db/prisma/schema.prisma`. Cliente compartido: `@tdoe/db`
  (`packages/db/src/index.ts`, más `BOARD_KEYS`, `BOARD_PHASES`, `PHASES_PER_KEY` en
  `packages/db/src/board.ts`).

### Migraciones (todas aplicadas)

| Migración                                          | Qué hace                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261105145444_init`                              | Tablas Staff, Event, Phase, Team, Participant, TeamPhase, Submission, Alert. **RLS activo sin políticas en todas** (incluida `_prisma_migrations`)        |
| `20261105145757_fk_indexes`                        | Índices en llaves foráneas; quita índices que repetían un `@unique`                                                                                       |
| `20261105150323_board_keys_and_phase_content`      | `Phase.key` (enum `BoardKey`) + `order` 1-3; `TeamPhase.content`                                                                                          |
| `20261105231454_event_mode_and_scenario`           | `Event.mode` (`SCHOOL`/`CUSTOM`) y `Event.scenario`                                                                                                       |
| `20261106011207_team_phase_completed_by`           | Quita `TeamPhase.keyActivated`; agrega `completedById` (quién contestó)                                                                                   |
| `20261106161554_submission_files_and_links`        | `Submission.links` y tabla `SubmissionFile` (con RLS)                                                                                                     |
| `20261107002643_team_messages`                     | Tabla `Message` (chat: `TEAM` / `PRIVATE` / `NUDGE`, id secuencial, `clientId` único por remitente) con RLS                                               |
| `20261108220835_mentors_and_evaluations`           | `Event.mentorCode`, tablas `Mentor` y `Evaluation` (calificación en JSON) con RLS                                                                         |
| `20261108221623_activity_timer_and_challenge_card` | `Event`: timer de actividad (`activityEndsAt`, `activitySeconds`, `activityVisible`) y carta de reto (`challengeKey`, `challengeText`, `challengeSentAt`) |
| `20261108230000_announcements`                     | Tabla `Announcement` (avisos generales del educador: `eventId`, `text`, `createdAt`) con RLS                                                              |
| `20261108233000_emergency_switches`                | `Event`: interruptores de emergencia `chatEnabled`, `submissionsEnabled`, `joinsEnabled` (todos `true` por defecto)                                       |
| `20261109000000_activity_log`                      | Enum `ActorType` y tabla `ActivityLog` (registro de actividad: actor, equipo, acción, detalle; sin llaves foráneas salvo el evento) con RLS               |
| `20261109010000_password_reset`                    | `Staff.passwordChangedAt` (cierra las sesiones anteriores) y tabla `PasswordReset` (solo el hash del token, vence, un uso) con RLS                        |

### Reglas de la base

- **Las tablas solo cambian con migraciones de Prisma.** Nunca con SQL directo (ni dashboard ni
  MCP). Por el MCP de Supabase solo se hacen **consultas de lectura** para verificar.
- **RLS en todas las tablas, sin políticas:** la llave pública no puede leer ni escribir nada. Prisma
  entra como dueño de las tablas y no le afecta. Supabase además tiene un trigger (`ensure_rls`, con
  la función `public.rls_auto_enable()`) que activa RLS en cada tabla nueva de `public`.
- **Cómo se crea una migración** (desde aquí no se puede usar `migrate dev` porque pide confirmar en
  modo interactivo):
  1. Editar `schema.prisma` y correr `prisma format`.
  2. Generar el SQL comparando contra el esquema anterior, sin conectarse:
     `prisma migrate diff --from-schema <esquema_anterior> --to-schema prisma/schema.prisma --script -o prisma/migrations/<fecha>_<nombre>/migration.sql`
     (el anterior se saca con `git show HEAD:packages/db/prisma/schema.prisma`).
  3. Si crea una tabla, agregar al final `ALTER TABLE "<Tabla>" ENABLE ROW LEVEL SECURITY;`.
  4. Revisar el SQL y aplicar con `prisma migrate deploy`.
  5. **Si la migración borra algo** (columnas, tablas), Claude no puede aplicarla: la corre Eddy con
     `! source ~/.nvm/nvm.sh && nvm use 22 && pnpm --filter @tdoe/db exec prisma migrate deploy`.

### Datos actuales (revisado el 10 nov)

- 13 migraciones aplicadas; la base está al día con `dev`.
- 3 eventos: el seed **`QATEST`** (Staff `seed@tabuleiro.local`, que **no puede iniciar sesión**: su
  hash es `"!"`) y dos de prueba del equipo, `WDAFL7` ("Prueba Proyecto") y `FVR7SM` ("Prueba
  Hackaton"). 3 cuentas de educador y 5 equipos en total. **Hay que quitar todo esto antes del 12 de
  noviembre.**
- Registro de actividad, mensajes, archivos y enlaces de recuperar contraseña: vacíos. La base pesa
  13 MB.
- Todas las pruebas en vivo de Claude crean sus propios datos (cuentas `@tabuleiro.test`) y los
  borran al terminar, con un script de Prisma (no con SQL).

### Storage

- Bucket **`submissions`**: privado, límite de 20 MB y solo tipos permitidos (PDF, Word, PowerPoint,
  imágenes). Lo crea el código la primera vez que se usa (`ensureBucket` en
  `apps/web/src/lib/storage/submissions.ts`). Hoy está vacío (0 archivos).

---

## 5. Arquitectura del backend (dónde está cada cosa)

```
apps/web/src/
  app/api/...                   route handlers (uno por endpoint, ver sección 6)
  proxy.ts                      protege /[locale]/mestre/* (educador), /[locale]/jogador/* (jugador) y /[locale]/mentor/*
  lib/api/errors.ts             apiError(code), ApiFailure (para abortar transacciones), readJsonObject
  lib/auth/session.ts           JWT con jose: sesión de educador (tdoe_staff, 12 h), jugador (tdoe_player, 36 h) y mentor (tdoe_mentor, 36 h)
  lib/auth/staff.ts             getStaffFromRequest / getStaffFromToken (la cuenta existe y la sesión es posterior al último cambio de contraseña)
  lib/auth/mentor.ts            getMentorFromRequest, setMentorSessionCookie
  lib/auth/player.ts            getPlayerFromRequest (participante + equipo + evento), setPlayerSessionCookie
  lib/auth/password.ts          hash de contraseñas con scrypt de Node (igual que Maestro-virtual)
  lib/auth/account.ts           reglas de correo, nombre y contraseña
  lib/auth/rate-limit.ts        límite de intentos por IP (en memoria)
  lib/codes.ts                  códigos de 6 caracteres sin I/O/0/1 (eventos y equipos)
  lib/auth/password-reset.ts    recuperar contraseña: token y su hash, vencimiento, enlace, sesiones anteriores al cambio
  lib/email/send.ts             sendEmail() con Resend (lo usa recuperar contraseña)
  lib/email/password-reset-email.ts  el correo de recuperar contraseña en los 4 idiomas
  lib/storage/submissions.ts    Storage por REST: bucket, URL de subida, lectura de bytes, URL de descarga, borrar
  lib/csv.ts                    CSV con BOM y celdas protegidas contra fórmulas
  lib/realtime/
    signals.ts                  tipos de aviso (messages, board, event, overview, announcements) y de configuración
    server.ts                   proveedor, nombres de canal firmados, notify() (se envía después de responder)
    batcher.ts                  junta avisos seguidos en el navegador (uno por tipo cada segundo)
    useRealtime.ts              hook del frontend: escucha, refresca de respaldo y se pone al día
  features/event/server/
    event.ts                    validación de crear evento, transiciones de estado, EventDTO
    progress.ts                 estado de cada llave a partir de las fases concluidas
    controls.ts                 timer de actividad y carta de reto (validación y DTOs)
    announcements.ts            avisos generales: validar, DTO, cuántos se muestran, límite por minuto
    switches.ts                 interruptores de emergencia: validar, DTO y switchGate() que revisa cada ruta
    alerts.ts                   alertas de mediación calculadas (equipo detenido, sin entrega, incompleto)
    owned-event.ts              cargar el evento del educador y avisar cambios
    board.ts                    arma GET /api/board, orden de fases, POINTS_PER_PHASE
    load-board.ts               consultas para el tablero
  features/activity/server/
    actions.ts                  acciones del registro (con su nombre en español), DTO, fila del CSV, query
    record.ts                   recordActivity() (escribe sin lanzar errores) y asPlayer/asStaff/asMentor
  features/team/server/team.ts  nombres, nicknames, códigos, cuándo se puede unir y jugar
  features/submission/server/
    rules.ts                    tipos de archivo, firmas (primeros bytes), tamaños, links https, validación
    dto.ts                      formatos de respuesta de entregas y archivos
  features/mentor/server/
    rubric.ts                   rúbrica (5 criterios, 1-5), validar calificaciones, promedios
    dto.ts                      formato de respuesta de una calificación
  features/communication/server/
    rules.ts                    chat: validar mensajes y query, quién ve qué, límites
    dto.ts                      formato de respuesta de los mensajes
apps/web/__tests__/             pruebas unitarias (Jest): lib/auth, lib/email, lib/realtime, features/event-server, players, submissions, messages, mentors, educator-controls, announcements, switches, activity
packages/db/                    esquema, migraciones, seed, prisma.config.ts
packages/db/scripts/
  load-test.ts                  prueba de carga (sección 10)
  staff-password.ts             contraseña nueva para un educador (sección 6)
```

### Patrones que se repiten

- **Reglas puras + route handler delgado:** la lógica (validar, decidir) vive en funciones sin base
  de datos dentro de `features/*/server/*.ts`, con pruebas unitarias. El route handler solo lee la
  sesión, consulta la base y responde.
- **Identidad siempre de la sesión**, nunca del body.
- **Errores como códigos** (`{ "error": "TEAM_FULL" }` y `fields` por campo); el frontend traduce.
  La lista está en `lib/api/errors.ts` y en la sección 6 de `api.md`.
- **Concurrencia:** cuando un límite importa (equipos por evento, integrantes por equipo, archivos por
  equipo), la transacción bloquea la fila con `SELECT ... FOR UPDATE`. Concluir una fase y confirmar
  un archivo son idempotentes: repetir no es error.
- **Lo ajeno responde "no existe"** (`EVENT_NOT_FOUND`, `FILE_NOT_FOUND`), para no revelar ids.

---

## 6. Qué está implementado

Detalle completo (bodies, respuestas, errores) en **`docs/backend/api.md`**.

| Bloque      | Endpoint                                                                                       | Quién                |
| ----------- | ---------------------------------------------------------------------------------------------- | -------------------- |
| Educador    | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`                     | Público              |
| Educador    | `POST /api/auth/password/forgot`, `.../check`, `.../reset` (recuperar la contraseña)           | Público              |
| Educador    | `POST /api/events`, `GET /api/events`                                                          | Educador             |
| Educador    | `PATCH /api/events/:id/status` (iniciar, pausar, retomar, terminar)                            | Educador             |
| Educador    | `GET /api/events/:id/overview` (métricas, equipos, avance, entregas, alertas)                  | Educador             |
| Jugadores   | `POST /api/teams`, `GET /api/teams?eventCode=`                                                 | Público              |
| Jugadores   | `POST /api/participants` (unirse o recuperar sesión)                                           | Público              |
| Jugadores   | `POST /api/teams/me/join-code` (nuevo código)                                                  | Líder                |
| Jugadores   | `GET /api/board`, `PUT /api/board/keys/:key/phases/:order`                                     | Jugador              |
| Jugadores   | `PUT /api/participants/me/rpg-role`                                                            | Jugador              |
| Entregas    | `GET /api/submissions`, `PUT /api/submissions`                                                 | Jugador              |
| Entregas    | `POST /api/submissions/files`, `POST .../files/:id/confirm`, `DELETE .../files/:id`            | Jugador              |
| Entregas    | `GET /api/submissions/files/:id` (descarga)                                                    | Equipo o su educador |
| Chat        | `GET /api/messages` (`?after=` / `?before=`), `POST /api/messages`                             | Jugador              |
| Tiempo real | `GET /api/realtime` (`?eventId=` para el educador)                                             | Jugador o educador   |
| Mentores    | `POST /api/events/:id/mentor-code`, `GET /api/events/:id/evaluations`                          | Educador             |
| Mentores    | `POST /api/mentors` (entrar), `GET /api/mentor`, `PUT /api/mentor/evaluations/:teamId`         | Público / Mentor     |
| Educador    | `PUT/PATCH/DELETE /api/events/:id/activity-timer`, `PUT/DELETE /api/events/:id/challenge-card` | Educador             |
| Educador    | `GET /api/events/:id/export?type=report\|proposals` (CSV)                                      | Educador             |
| Educador    | `GET/POST /api/events/:id/announcements`, `DELETE .../announcements/:announcementId`           | Educador             |
| Educador    | `PATCH /api/events/:id/switches` (apagar chat, entregas o entradas)                            | Educador             |
| Educador    | `GET /api/events/:id/activity` (registro de actividad) y `export?type=activity` (CSV)          | Educador             |
| —           | `GET /api/health`                                                                              | Público              |

- `GET /api/phases` sigue respondiendo 501 a propósito: lo reemplaza `GET /api/board`.
- Pruebas: **116 unitarias** (Jest), más pruebas en vivo de cada bloque contra Supabase (tablas en
  la descripción de cada PR).

### Script: contraseña nueva para un educador

En producción no se mandan correos (no hay dominio en Resend), así que "¿Olvidaste tu contraseña?"
no le llega a nadie. Si un educador la olvida, Eddy (o quien tenga el `.env`) corre:

```bash
pnpm staff:password --list                    # cuentas: correo, nombre, fecha, eventos
pnpm staff:password --email ana@ejemplo.com   # contraseña nueva para esa cuenta
```

- Genera una contraseña de 19 caracteres (`xxxx-xxxx-xxxx-xxxx`, sin letras que se confundan), la
  muestra **una vez** y guarda solo su hash. Se le pasa al educador por privado.
- Mismo efecto que recuperar por correo: **se cierran todas sus sesiones abiertas** y se borran sus
  enlaces pendientes. El correo se acepta en mayúsculas o minúsculas.
- Escribe en la base de `DATABASE_URL` (`apps/web/.env`), que es la de producción.
- Probado en vivo el 10 nov: la sesión anterior responde `401`, el enlace pendiente
  `RESET_TOKEN_INVALID`, la contraseña vieja `INVALID_CREDENTIALS` y la nueva entra.

---

## 7. Decisiones tomadas

### Confirmadas por el equipo

- **JP (5 nov):** el tablero llega ya armado con la forma del estado de `PlayerBoard`; el avance
  entre llaves es **automático** (al concluir la 3.ª fase se activa la siguiente, en orden fijo
  Problema → Solución → Alianzas → Oportunidades); errores como código puro; sesión del jugador por
  cookie.
- **PM (5 nov):** **pausar no detiene el reloj**; solo bloquea a los participantes.
- Nombre único de la llave pública: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### Defaults tomados (se cambian sin rehacer nada)

| Tema                           | Default                                                                                      | Dónde se cambia                                |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Entrar al equipo               | Código del equipo + nickname, sin contraseña                                                 | —                                              |
| Volver a entrar                | Mismo código + mismo nickname recupera el lugar                                              | `app/api/participants/route.ts`                |
| Quién contesta fases y entrega | Cualquier miembro                                                                            | —                                              |
| Editar una fase concluida      | No se puede                                                                                  | `features/event/server/board.ts`               |
| Puntos por fase                | 0                                                                                            | `POINTS_PER_PHASE` en `board.ts`               |
| Rol del juego de rol           | Se puede repetir en el equipo                                                                | `app/api/participants/me/rpg-role/route.ts`    |
| Duración del evento            | 24 h, timer global                                                                           | `DEFAULT_EVENT_DURATION_MINUTES` en `event.ts` |
| Archivos                       | PDF, Word, PowerPoint, imágenes; 20 MB; 5 por equipo; 5 links extra                          | `features/submission/server/rules.ts`          |
| Registro de educadores         | Abierto a cualquiera (revisar en la auditoría)                                               | `app/api/auth/register/route.ts`               |
| Chat: quién ve qué             | `TEAM` todo el equipo; `PRIVATE` y `NUDGE` solo remitente y destino                          | `features/communication/server/rules.ts`       |
| Chat: cuándo se puede mandar   | Igual que el tablero (`ACTIVE` y con tiempo); leer, siempre                                  | `app/api/messages/route.ts`                    |
| Chat: límites                  | 1000 caracteres; 30 mensajes/min; 1 toque cada 30 s a la misma persona                       | `rules.ts` y `route.ts` del chat               |
| Chat: el educador lee mensajes | No                                                                                           | —                                              |
| Tiempo real: proveedor         | Supabase Broadcast con canales públicos de nombre firmado; avisos sin datos                  | `lib/realtime/server.ts`, `REALTIME_PROVIDER`  |
| Tiempo real: refresco          | 60 s conectado, 5 s desconectado                                                             | `POLL_MS` en `lib/realtime/server.ts`          |
| Mentores: acceso               | Código de mentores del evento + nombre, sin contraseña; máx. 50                              | `features/mentor/server/rubric.ts`             |
| Mentores: rúbrica              | 5 criterios (problema, solución, impacto, viabilidad, presentación) del 1 al 5               | `RUBRIC` en `rubric.ts` (sin migración)        |
| Mentores: a quién califican    | A todos los equipos del evento, en cualquier estado                                          | `app/api/mentor/evaluations/[teamId]/route.ts` |
| Timer de actividad             | 1-180 min; los jugadores lo ven solo si está visible                                         | `features/event/server/controls.ts`            |
| Carta de reto                  | Una a la vez, para todos los equipos; 500 caracteres                                         | `controls.ts`                                  |
| Alertas                        | Detenido 60 min; sin entrega a 2 h del final (crítica a 30 min); menos de 2 integrantes      | `features/event/server/alerts.ts`              |
| Avisos generales               | 1000 caracteres; en cualquier estado; se muestran los últimos 20; 10 por minuto              | `features/event/server/announcements.ts`       |
| Avisos generales: leídos       | El backend no lleva quién leyó qué (el navegador recuerda el último que mostró)              | —                                              |
| Interruptores                  | Por evento, los maneja su educador; leer y descargar siguen funcionando                      | `features/event/server/switches.ts`            |
| Entradas cerradas              | Bloquea equipos e integrantes nuevos; recuperar sesión y entrar mentores, sí                 | `app/api/participants/route.ts`                |
| Registro de actividad          | Toda acción que cambia algo; sin texto del chat ni respuestas; se escribe antes de responder | `features/activity/server/actions.ts`          |
| Recuperar contraseña           | Enlace de 60 min, un uso, 3 por cuenta por hora; al cambiarla se cierran las demás sesiones  | `lib/auth/password-reset.ts`                   |
| Recuperar contraseña (prod.)   | Sin correo (no hay dominio): la cambia Eddy con `pnpm staff:password`                        | `packages/db/scripts/staff-password.ts`        |
| Entradas por IP                | 500 cada 5 min en crear equipo y unirse (#18; antes 300)                                     | `app/api/teams` y `app/api/participants`       |
| Registro: mensajes privados    | Guarda a quién se le escribió (no el texto) ❓                                               | `app/api/messages/route.ts`                    |

---

## 8. Dónde estamos y qué falta (10 nov)

### 8.1 Estado por parte

| Parte                      | Estado                                                                                   | Quién          |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------------- |
| Backend (alcance acordado) | **Hecho, probado y en `dev`**                                                            | Eddy           |
| Base de datos              | **Al día** (13 migraciones aplicadas)                                                    | Eddy           |
| Frontend conectado         | **Hecho en `dev`** (#18); falta el QA                                                    | JP / Brandon   |
| Hosting                    | **Vercel**, funciones en `iad1` (junto a la base). Sirve `main`, **todavía sin backend** | Brandon        |
| Planes                     | Vercel Pro y Supabase Pro **por confirmar**. Presupuesto de Supabase listo para el dueño | Brandon / Eddy |
| Correos (recuperar clave)  | **No habrá dominio**: en producción no se mandan. Se usa `pnpm staff:password` (6)       | Eddy           |
| Prueba de carga real       | Pendiente: cuando `main` tenga el backend                                                | Eddy           |
| Limpieza de la base        | Pendiente, después del QA                                                                | Eddy           |
| Auditoría de seguridad     | Pendiente (8.6)                                                                          | Eddy           |
| Pruebas (QA)               | 10-11 nov sobre `dev`                                                                    | Leo            |

### 8.2 Lo más urgente: que producción tenga el backend

`https://tabuleiro-do-empreendedor.vercel.app` despliega `main`, que sigue en el PR #1 (4 nov):
`GET /api/teams?eventCode=...` responde `501 not_implemented`. Orden:

1. QA de Leo sobre `dev` (en local o en un preview de `dev`, **no** en la URL de producción).
2. PR `dev` → `main` (al 10 nov no existe todavía), aprobación y merge.
3. Revisar que el deploy ya responde: `GET /api/teams?eventCode=XXXXXX` debe dar `404
EVENT_NOT_FOUND`, no `501`.
4. Prueba de carga contra esa URL (8.5).

### 8.3 Frontend (JP)

El PR #18 conectó todo lo de la sección 8 de `api.md`: tablero, chat, tiempo real, archivos en 3
pasos, controles del educador, avisos, interruptores, mentores y recuperar contraseña. Lo confirma
el QA.

- **Recuperar contraseña sin correo:** la pantalla dice "si el correo está registrado, te llegó un
  enlace", pero en producción no llega nada. JP decide si oculta el enlace o cambia el texto (por
  ejemplo, "pídele una contraseña nueva al organizador").

### 8.4 Hosting (Brandon)

- **Vercel Pro hace falta:** Hobby es solo para uso no comercial y trae 1 M de llamadas al mes; 24 h
  de evento con tiempo real son ~1.3 M (~15 por segundo).
- **Variables** (nombres exactos de `.env.example`): `DATABASE_URL`, `AUTH_SECRET`,
  `NEXT_PUBLIC_APP_URL=https://tabuleiro-do-empreendedor.vercel.app` (sin `/en` ni `/` final),
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`;
  `DATABASE_POOL_MAX` (3-5). `RESEND_API_KEY` y `MAIL_FROM` pueden quedar vacías.
- Las funciones corren en `iad1` (cabecera `x-vercel-id`), la misma zona que Supabase (us-east-1).

### 8.5 Pendiente del backend (Eddy)

1. **Plan de Supabase:** revisar en el panel (Organization → Billing) y pasar a Pro antes del 12.
   Free acepta 200 conexiones en vivo; el evento necesita ~400.
2. **Correr `pnpm load-test --base https://tabuleiro-do-empreendedor.vercel.app --duration 300`**
   cuando `main` tenga el backend (sección 10). Crea 60 equipos y 300 participantes en la base real
   y los borra al terminar; nunca durante el evento.
3. **Limpiar la base después del QA:** `QATEST` y `seed@tabuleiro.local`, `WDAFL7`, `FVR7SM` y sus
   equipos. Con un script de Prisma.
4. **Auditoría de seguridad** (8.6).
5. Lo que salga del QA y de las decisiones abiertas (8.7).

### 8.6 Para la auditoría de seguridad

Pendientes conocidos (Claude lleva la lista completa en su memoria):

- Contraseña de la base: se vio en una sesión el 4 nov. **Eddy decidió no cambiarla (10 nov).**
  Revisar que el `.env` compartido con el equipo no termine en ningún lado público.
- Registro de educadores abierto a cualquiera (¿lista de correos permitidos?).
- Aviso del advisor de Supabase sobre `public.rls_auto_enable()`.
- Límites de intentos en memoria (por instancia; débiles en Vercel).
- Archivos validados solo por sus primeros bytes (sin antivirus; `.docx`/`.pptx` = cualquier ZIP).
- Recuperar la sesión del jugador con código del equipo + nickname (cualquiera con el código).
- Tiempo real por canales públicos de Supabase (nombres firmados y avisos sin datos).
- Chat sin moderación; avisos generales con texto libre (el frontend los muestra como texto plano).
- Interruptores solo por evento (no hay administrador de la plataforma).
- Registro de actividad: guarda nicknames y a quién se escribe en privado; consentimiento y
  anonimizar antes de compartir el CSV fuera de los organizadores.
- Recuperar contraseña: no hay "cerrar sesión en todos lados" ni cambiar la contraseña con sesión.
  Sin correo en producción, la cambia a mano quien tiene el `.env`.
- Los PRs del 10 nov se aprobaron con la cuenta del product owner: revisar quién tiene acceso a esa
  cuenta y la protección de las ramas.

### 8.7 Decisiones abiertas (hay defaults; alguien debería confirmarlas)

- ¿El líder necesita cuenta con correo y contraseña? (el PM dijo "que solo se registre el líder").
- ¿El registro de actividad debe guardar a quién le escribe cada participante en privado? (hoy sí,
  sin el texto).
- ¿El educador puede leer el chat de los equipos (moderación)? (hoy no).
- ¿La rúbrica de mentores está bien? (5 criterios del 1 al 5, cada mentor califica a todos).
- ¿Qué cambia en el modo "personalizado" además del texto del escenario? ¿Cómo se dan los puntos?
  (hoy 0 por fase).
- ¿El campo `proposta` del mural es la descripción de la entrega o algo aparte?
- ¿Se oculta "¿Olvidaste tu contraseña?" mientras no haya correos? (JP).

### 8.8 Antes del evento (checklist)

- [x] Merge de #7 → #17 a `dev` (10 nov).
- [x] Frontend conectado (#18).
- [ ] QA de Leo sobre `dev` (10-11).
- [ ] PR `dev` → `main` y deploy con el backend (`/api/teams` deja de responder `501`).
- [ ] Vercel Pro y variables (8.4).
- [ ] Supabase Pro (8.5).
- [ ] `pnpm load-test --base <url>` contra producción.
- [ ] **Probar desde el wifi del lugar** (5 min): subir un PDF en la entrega y ver que el chat llegue
      en vivo. La red de la escuela bloquea la base (puertos 5432/6543), pero eso no afecta a la app
      hospedada: el navegador solo habla con la app por HTTPS. Lo único que el navegador hace directo
      con `*.supabase.co` (también HTTPS 443) es **subir archivos** (fallaría si bloquean ese
      dominio) y **escuchar avisos en vivo** (si falla, la pantalla refresca sola cada 5 s).
- [ ] Limpiar la base (8.5).
- [ ] Auditoría de seguridad (8.6).

### Historial de bloques de backend propuestos el 8 nov

1. ~~Avisos generales~~ **hecho (#14).**
2. ~~Interruptores de emergencia~~ **hecho (#15).**
3. ~~Registro de actividad para la investigación~~ **hecho (#16).**
4. ~~Recuperar la contraseña del educador por correo~~ **hecho (#17).**
5. ~~Preparar la VM de Azure~~ **no hace falta: se eligió Vercel.**
6. Contraseña nueva sin correo (`pnpm staff:password`): **PR #19.**

### Para el resto del equipo

- **JP:** sección 8.3. `api.md` es el contrato.
- **Brandon:** secciones 8.2 y 8.4.
- **Leo:** QA sobre `dev` (8.2). `apps/web/jest.config.mjs` transforma `jose` (paquete solo ESM); sin
  eso, cualquier prueba que importe la sesión falla. Hay 116 pruebas unitarias del backend en
  `apps/web/__tests__/`; las tablas de pruebas en vivo están en la descripción de cada PR.

---

## 9. Cómo retomar (checklist)

1. **Dónde está lo último:** en `dev`, en la carpeta principal `tabuleiro-do-empreendedor`.
2. `nvm use`, `git switch dev && git pull` y `gh pr list --state all`:
   - Si el PR del bloque anterior sigue abierto, crear la rama desde la de ese PR y abrir el nuevo
     PR con esa base.
   - Si ya entró, crear la rama desde `dev`.
   - **Nunca aprobar ni hacer merge de los PRs propios**: los aprueba alguien del equipo.
3. `pnpm install && pnpm db:generate`.
4. `pnpm --filter @tdoe/db exec prisma migrate status`: debe decir "Database schema is up to date".
5. Leer la sección 8 de este documento ("Dónde estamos y qué falta") y `docs/backend/api.md`
   (contrato).
6. Antes de cada PR: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, prueba en vivo contra
   Supabase (y borrar los datos de prueba) y actualizar `api.md` y este documento.

---

## 10. Prueba de carga (8 nov)

`pnpm load-test` (script en `packages/db/scripts/load-test.ts`) crea un evento propio, mete **60
equipos y 300 participantes por la API** y simula a todos usando la app a la vez: el chat se
refresca cada 5 s y el tablero cada 15 s (el peor caso, sin tiempo real), cada quien manda un
mensaje por minuto, el líder concluye una fase cada 60-120 s y el educador mira el resumen cada
10 s. Al final borra todo. Opciones: `--base <url>`, `--teams`, `--members`, `--duration`,
`--messages-every`, `--board-every`, `--keep`.

Corrido desde la casa de Eddy (servidor local en modo producción, base en Supabase us-east-1):

| Corrida                                         | Entradas                                                               | Resultado                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Pool de 5, espera de transacción de 2 s (antes) | 97 de 300 fallaron ("Unable to start a transaction in the given time") | 6.6 % de errores                                                                    |
| Pool de 5, espera de 15 s (`INTERACTIVE_TX`)    | 300 / 300                                                              | Entradas bien; la simulación se satura (11 req/s de capacidad contra ~85 pedidas)   |
| **Pool de 20, espera de 15 s**                  | **300 / 300 en 28 s**                                                  | **0 errores**, 42 req/s, 362 mensajes y 60 fases guardadas                          |
| Pool de 20 + registro de actividad (#16), 120 s | 300 / 300 en 34 s                                                      | 0 errores, 38.5 req/s; 704 filas en el registro, una por acción, sin perder ninguna |

Conclusiones:

- **Se corrigió un error real:** en la ola de entradas del inicio, crear equipo / unirse fallaba
  porque Prisma solo espera 2 s por una conexión libre. Ahora espera hasta 15 s.
- **La capacidad crece en proporción al pool** (5 → 20 conexiones: 11 → 42 req/s): el límite de esta
  prueba es la distancia casa → Virginia (~70 ms por consulta, 6-8 consultas por petición), no la
  base. Con el servidor junto a la base (Vercel iad1 o Azure East US, ~1-2 ms) cada petición debería
  tardar mucho menos; **falta confirmarlo corriendo el script contra el hosting real**.
- **El tiempo real importa:** con avisos, el chat y el tablero se refrescan cada 60 s en lugar de
  5-15 s: la carga baja de ~85 a ~15 req/s.
- **El registro de actividad** agrega una inserción por acción (desde la casa, ~70 ms): la
  capacidad bajó un poco (42 → 38.5 req/s), sin errores. Junto a la base no debería notarse.
- **`DATABASE_POOL_MAX`:** en Vercel 3-5 por instancia (el pooler de Supabase acepta ~200 conexiones
  de cliente en los planes chicos y cada instancia abre las suyas); en una VM, 10-20.
