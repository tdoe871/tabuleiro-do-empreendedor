# Estado del backend — Tabuleiro do Empreendedor

> Bitácora del backend y la base de datos (responsable: Eddy). Dice **qué está hecho, dónde está,
> cómo se trabaja y qué sigue**, para que cualquiera (o Claude en una sesión nueva) retome sin
> perder el hilo. Última actualización: **8 nov 2026 (noche)**.
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

- Plataforma del LATAM Social Business Hackathon (Monterrey, **12-13 nov 2026**, 24 h, ~300
  participantes, ~60 equipos de 2 a 5). **Lunes 9: todo terminado.** Martes 10 y miércoles 11: QA.
- Un solo deploy de Next.js 16 (API en route handlers) + Prisma 7 sobre Postgres de Supabase.
- **Hechos y probados contra Supabase real:** base de datos, login del educador, sesiones del
  educador (crear / listar / iniciar / pausar / terminar / resumen), equipos y jugadores, tablero con
  avance automático entre llaves, entregas con links y archivos, chat del equipo (mensajes al
  equipo, privados y toques), tiempo real (avisos por Supabase Broadcast con refresco de respaldo),
  mentores y calificación, controles del educador (timer de actividad, carta de reto, alertas
  automáticas, exportar a CSV), prueba de carga local, avisos generales del educador.
- **Falta:** correr la prueba de carga contra el hosting real y lo que el equipo pida en QA.

---

## 2. Dónde estamos ahora (git y PRs)

| PR  | Rama                        | Base                        | Estado       | Contenido                                                                                         |
| --- | --------------------------- | --------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| #2  | `feature/backend-base`      | `dev`                       | **Merged**   | `prisma.config.ts`, Prisma fijo en 7.10.1, 3 migraciones, seed, borrador del contrato             |
| #3  | `feature/staff-auth`        | `dev`                       | **Merged**   | Bloque del educador: login/registro/logout, eventos, correos (Resend), nombre de la llave pública |
| #7  | `feature/players`           | `dev`                       | **Abierto**  | Bloque de jugadores: equipos, sesión del jugador, tablero                                         |
| #8  | `feature/submissions`       | `feature/players`           | **Merged**   | Bloque de entregas. Se hizo merge a `feature/players`, así que ya viene dentro del #7             |
| #9  | `feature/chat`              | `feature/players`           | **Merged**   | Chat del equipo (merge a `feature/players`)                                                       |
| #10 | `feature/realtime`          | `feature/chat`              | **Merged**   | Tiempo real (merge en cascada a `feature/players`)                                                |
| #11 | `feature/mentors`           | `feature/players`           | **Abierto**  | Mentores y calificación (montado sobre #7)                                                        |
| #12 | `feature/educator-controls` | `feature/mentors`           | **Abierto**  | Timer de actividad, carta de reto, alertas y exportar (montado sobre #11)                         |
| #13 | `feature/load-test`         | `feature/educator-controls` | **Abierto**  | Prueba de carga, pool configurable y espera de transacciones (montado sobre #12)                  |
| #14 | `feature/announcements`     | `feature/load-test`         | **Abierto**  | Avisos generales del educador a todo el evento (montado sobre #13)                                |
| #6  | `ui/theme-sandbox-test`     | `dev`                       | Abierto (JP) | Frontend: diseño nuevo + conexión real del panel del educador y login                             |
| #5  | `test/initial-tests`        | `qa`                        | Merged (Leo) | Pruebas iniciales (unitarias, contrato y E2E)                                                     |

- **#7 trae ahora jugadores + entregas** y no tiene conflictos con `dev`. Lo tiene que aprobar
  alguien del equipo: **Eddy no aprueba ni hace merge de sus propios PRs (ni Claude por él).**
- Ramas locales de Eddy: `local/prueba` (= `feature/players` + `dev`, **solo para probar en local,
  no se sube**) y las ramas de bloque (en la carpeta aparte `../tabuleiro-chat`, un
  `git worktree`, con un enlace a `apps/web/.env`).
- Archivos locales **sin versionar** (a propósito): `.mcp.json` (config del MCP de Supabase) y
  `docs/architecture/backend/` (contexto inicial).
- **#9 y #10 ya están dentro de `feature/players`**: el #7 trae jugadores, entregas, chat y tiempo
  real. **Orden de merge (en cascada):** #7 → #11 (mentores) → #12 (controles del educador) → #13
  (carga) → #14 (avisos generales).
  Cada uno está montado sobre el anterior; al hacer merge de uno, GitHub pasa el siguiente a su base.
- **Forma de trabajo acordada:** **un PR por bloque grande** (educador, jugadores, entregas, ...),
  no uno por cada tarea chica.

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

| Variable                               | Para qué                                 | Notas                                                                                      |
| -------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                         | La app (Prisma con `@prisma/adapter-pg`) | Pooler de transacción, puerto **6543**                                                     |
| `DIRECT_URL`                           | Solo migraciones (CLI de Prisma)         | Pooler de sesión, puerto **5432** (las migraciones necesitan locks que el 6543 no soporta) |
| `AUTH_SECRET`                          | Firmar sesiones (jose)                   | Mínimo 32 caracteres                                                                       |
| `NEXT_PUBLIC_APP_URL`                  | URL base                                 | `http://localhost:3000` en local                                                           |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto Supabase                |                                                                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Llave pública (`sb_publishable_…`)       | Todavía no la usa ningún código. Antes se llamaba `..._ANON_KEY`; se unificó el nombre     |
| `SUPABASE_SECRET_KEY`                  | Storage desde el servidor                | **Solo servidor**, se salta RLS. Necesaria para archivos                                   |
| `DATABASE_POOL_MAX`                    | Conexiones a la base por instancia       | Opcional (5). Vercel: 3-5. Una VM: 10-20                                                   |
| `RESEND_API_KEY`, `MAIL_FROM`          | Correos                                  | Opcionales en local (sin ellas, el correo se imprime en la terminal)                       |
| `REALTIME_PROVIDER`                    | Tiempo real: `supabase` o `none`         | Opcional. Vacía: Supabase si existen las llaves, si no solo refresco                       |

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

### Datos actuales

- Solo el seed: Staff `seed@tabuleiro.local` (**no puede iniciar sesión**: su hash es `"!"`) y el
  evento **`QATEST`** con sus 12 fases. **Hay que quitarlos antes del 12 de noviembre.**
- Todas las pruebas en vivo crean sus propios datos y los borran al terminar.

### Storage

- Bucket **`submissions`**: privado, límite de 20 MB y solo tipos permitidos (PDF, Word, PowerPoint,
  imágenes). Lo crea el código la primera vez que se usa (`ensureBucket` en
  `apps/web/src/lib/storage/submissions.ts`). Hoy está vacío.

---

## 5. Arquitectura del backend (dónde está cada cosa)

```
apps/web/src/
  app/api/...                   route handlers (uno por endpoint, ver sección 6)
  proxy.ts                      protege /[locale]/mestre/* (educador) y /[locale]/jogador/* (jugador)
  lib/api/errors.ts             apiError(code), ApiFailure (para abortar transacciones), readJsonObject
  lib/auth/session.ts           JWT con jose: sesión de educador (tdoe_staff, 12 h) y de jugador (tdoe_player, 36 h)
  lib/auth/staff.ts             getStaffFromRequest / getStaffFromToken (revisa que la cuenta exista)
  lib/auth/player.ts            getPlayerFromRequest (participante + equipo + evento), setPlayerSessionCookie
  lib/auth/password.ts          hash de contraseñas con scrypt de Node (igual que Maestro-virtual)
  lib/auth/account.ts           reglas de correo, nombre y contraseña
  lib/auth/rate-limit.ts        límite de intentos por IP (en memoria)
  lib/codes.ts                  códigos de 6 caracteres sin I/O/0/1 (eventos y equipos)
  lib/email/send.ts             sendEmail() con Resend (todavía ningún flujo lo usa)
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
    alerts.ts                   alertas de mediación calculadas (equipo detenido, sin entrega, incompleto)
    owned-event.ts              cargar el evento del educador y avisar cambios
    board.ts                    arma GET /api/board, orden de fases, POINTS_PER_PHASE
    load-board.ts               consultas para el tablero
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
apps/web/__tests__/             pruebas unitarias (Jest): lib/auth, lib/email, lib/realtime, features/event-server, players, submissions, messages, mentors, educator-controls, announcements
packages/db/                    esquema, migraciones, seed, prisma.config.ts
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
| —           | `GET /api/health`                                                                              | Público              |

- `GET /api/phases` sigue respondiendo 501 a propósito: lo reemplaza `GET /api/board`.
- Pruebas: **101 unitarias** (Jest), más pruebas en vivo de cada bloque contra Supabase (tablas en
  la descripción de cada PR).

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

| Tema                           | Default                                                                                 | Dónde se cambia                                |
| ------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Entrar al equipo               | Código del equipo + nickname, sin contraseña                                            | —                                              |
| Volver a entrar                | Mismo código + mismo nickname recupera el lugar                                         | `app/api/participants/route.ts`                |
| Quién contesta fases y entrega | Cualquier miembro                                                                       | —                                              |
| Editar una fase concluida      | No se puede                                                                             | `features/event/server/board.ts`               |
| Puntos por fase                | 0                                                                                       | `POINTS_PER_PHASE` en `board.ts`               |
| Rol del juego de rol           | Se puede repetir en el equipo                                                           | `app/api/participants/me/rpg-role/route.ts`    |
| Carta de reto                  | `cartaAtiva` siempre `null`                                                             | `board.ts`                                     |
| Duración del evento            | 24 h, timer global                                                                      | `DEFAULT_EVENT_DURATION_MINUTES` en `event.ts` |
| Archivos                       | PDF, Word, PowerPoint, imágenes; 20 MB; 5 por equipo; 5 links extra                     | `features/submission/server/rules.ts`          |
| Registro de educadores         | Abierto a cualquiera                                                                    | `app/api/auth/register/route.ts`               |
| Chat: quién ve qué             | `TEAM` todo el equipo; `PRIVATE` y `NUDGE` solo remitente y destino                     | `features/communication/server/rules.ts`       |
| Chat: cuándo se puede mandar   | Igual que el tablero (`ACTIVE` y con tiempo); leer, siempre                             | `app/api/messages/route.ts`                    |
| Chat: límites                  | 1000 caracteres; 30 mensajes/min; 1 toque cada 30 s a la misma persona                  | `rules.ts` y `route.ts` del chat               |
| Chat: el educador lee mensajes | No                                                                                      | —                                              |
| Tiempo real: proveedor         | Supabase Broadcast con canales públicos de nombre firmado; avisos sin datos             | `lib/realtime/server.ts`, `REALTIME_PROVIDER`  |
| Tiempo real: refresco          | 60 s conectado, 5 s desconectado                                                        | `POLL_MS` en `lib/realtime/server.ts`          |
| Mentores: acceso               | Código de mentores del evento + nombre, sin contraseña; máx. 50                         | `features/mentor/server/rubric.ts`             |
| Mentores: rúbrica              | 5 criterios (problema, solución, impacto, viabilidad, presentación) del 1 al 5          | `RUBRIC` en `rubric.ts` (sin migración)        |
| Mentores: a quién califican    | A todos los equipos del evento, en cualquier estado                                     | `app/api/mentor/evaluations/[teamId]/route.ts` |
| Timer de actividad             | 1-180 min; los jugadores lo ven solo si está visible                                    | `features/event/server/controls.ts`            |
| Carta de reto                  | Una a la vez, para todos los equipos; 500 caracteres                                    | `controls.ts`                                  |
| Alertas                        | Detenido 60 min; sin entrega a 2 h del final (crítica a 30 min); menos de 2 integrantes | `features/event/server/alerts.ts`              |
| Avisos generales               | 1000 caracteres; en cualquier estado; se muestran los últimos 20; 10 por minuto         | `features/event/server/announcements.ts`       |
| Avisos generales: leídos       | El backend no lleva quién leyó qué (el navegador recuerda el último que mostró)         | —                                              |

---

## 8. Qué sigue

### Siguientes bloques (avanzar con defaults, sin bloquearse)

1. **Correr la prueba de carga contra el hosting real** (Vercel o la VM de Azure) en cuanto exista:
   `pnpm load-test --base https://<url> --duration 300`. Ver "Prueba de carga" abajo.
2. **Limpieza antes del evento:** quitar el seed (`QATEST`) y los eventos de prueba del equipo
   (hoy: `Prueba Hackaton` / `FVR7SM` y `Prueba Proyecto` / `WDAFL7`).
3. **Siguientes tareas de backend propuestas (8 nov), en este orden:**
   1. ~~**Avisos generales**~~ **hecho (#14):** el educador manda un mensaje a todo el evento;
      jugadores y mentores lo ven, aviso de tiempo real `announcements`.
   2. **Interruptores de emergencia:** apagar chat, entregas o entradas sin volver a desplegar
      (banderas en la base, revisadas por cada ruta).
   3. **Registro de actividad para la investigación:** quién hizo qué y cuándo, exportable a CSV.
   4. **Recuperar la contraseña del educador por correo** (necesita el dominio verificado en Resend).
   5. **Dejar el proyecto listo para la VM de Azure** si el equipo elige ese plan: build
      `standalone`, `DATABASE_POOL_MAX=10-20`, pasos documentados.

### Decisiones abiertas (ver ❓ en `api.md`)

- ¿El líder necesita cuenta con correo y contraseña? (el PM dijo "que solo se registre el líder").
- ¿El educador puede leer el chat de los equipos (moderación)? ¿La rúbrica de mentores (5 criterios
  del 1 al 5, a todos los equipos) está bien?
- ¿Qué cambia en el modo "personalizado"? ¿Cómo se dan los puntos?
- Presupuesto de hosting. **Recomendación:** Vercel Pro + Supabase Pro antes del martes 10 (≈45 USD
  al mes más quizá 10-30 USD de consumo el día del evento). Revisar el tope de gasto de Supabase
  (activado por defecto en Pro) y poner alerta de gasto en Vercel. Con Hobby/Free **no alcanza**
  (1 M de llamadas al mes en Vercel; 200 conexiones de tiempo real en Supabase).
- **Plan B sin dinero:** la app en una máquina virtual (crédito de Azure for Students) con
  `next start`, la base y Storage en Supabase Free y `REALTIME_PROVIDER=none` (solo refresco; en un
  servidor propio no se paga por llamada). El código no depende de Vercel. Faltaría: medio día de
  Brandon (VM, HTTPS, reinicio automático, monitoreo) y bajar el límite de archivos (Free: 1 GB). Si
  se quisiera tiempo real ahí, el lugar es un proveedor `socketio` en `lib/realtime/server.ts` y
  `useRealtime.ts` (servidor propio de Next.js con socket.io en el mismo proceso, ~medio día).
- Dominio para los correos (Resend necesita un dominio verificado para enviar a cualquiera).

### Para el resto del equipo

- **JP:** conectar pantallas según la sección 8 de `api.md` (crear evento con el código del backend,
  crear/unirse a equipo, campo de nickname en el link de invitación, tablero desde `GET /api/board`,
  estado `bloqueada` y quitar el botón de activar llave, modal de entrega en 3 pasos, traducir
  códigos de error, mandar al login con `401`), conectar el chat y usar `useRealtime` (puntos 10 y
  11 de esa sección). Para ver los paneles en local hay que registrarse
  como educador y crear o unirse a un equipo (por ejemplo en `QATEST`).
- **Brandon:** variables en GitHub y Vercel con los nombres de `.env.example`
  (`SUPABASE_SECRET_KEY` es indispensable para archivos y para mandar avisos;
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para que el navegador escuche).
- **Leo:** `apps/web/jest.config.mjs` transforma `jose` (paquete solo ESM); sin eso, cualquier
  prueba que importe la sesión falla.

### Antes del evento

- **Probar desde el wifi del lugar del evento** (5 min): subir un PDF en la entrega y ver que el chat
  llegue en vivo. La red de la escuela bloquea la base (puertos 5432/6543), pero eso no afecta a la
  app hospedada: el navegador solo habla con la app por HTTPS. Lo único que el navegador hace directo
  con `*.supabase.co` (también por HTTPS 443) es **subir archivos** (fallaría si bloquean ese dominio)
  y **escuchar avisos en vivo** (si falla, la pantalla refresca sola cada 5 s).
- Correr `pnpm load-test --base <url>` contra el hosting real.
- Auditoría completa de seguridad (pedida por Eddy para el final). La lista de pendientes la lleva
  Claude en su memoria; incluye: cambiar la contraseña de la base, `.env` compartido completo,
  registro abierto de educadores, aviso del advisor sobre `rls_auto_enable()`, límite de intentos
  en memoria, archivos validados solo por sus primeros bytes, recuperar sesión con el código del
  equipo.
- Quitar el seed (`QATEST` y `seed@tabuleiro.local`).
- Pruebas de carga.

---

## 9. Cómo retomar (checklist)

1. **Dónde está lo último:** mientras no se haga merge de #7 → #11 → #12 → #13 → #14, el código y
   esta bitácora al día viven en la rama **`feature/announcements`**, en la carpeta aparte
   **`/Users/eduardo/tabuleiro-chat`** (un `git worktree`; su `apps/web/.env` es un enlace al de la
   carpeta principal). La carpeta principal (`tabuleiro-do-empreendedor`) está en `local/prueba`,
   una rama solo para probar en local (no se sube) con una **copia vieja** de este documento.
2. `nvm use` y `gh pr list --state all`: ¿ya se hizo merge de #7, #11, #12 y #13?
   - Si no: seguir en `../tabuleiro-chat`, crear la rama del siguiente bloque desde
     `feature/announcements` y abrir el PR con base `feature/announcements`.
   - Si sí: `git switch dev && git pull` y crear la rama desde `dev`.
   - **Nunca aprobar ni hacer merge de los PRs propios**: los aprueba alguien del equipo.
3. `pnpm install && pnpm db:generate`.
4. `pnpm --filter @tdoe/db exec prisma migrate status`: debe decir "Database schema is up to date".
5. Leer `docs/backend/api.md` (contrato) y la sección 8 de este documento ("Qué sigue").
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

| Corrida                                         | Entradas                                                               | Resultado                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Pool de 5, espera de transacción de 2 s (antes) | 97 de 300 fallaron ("Unable to start a transaction in the given time") | 6.6 % de errores                                                                  |
| Pool de 5, espera de 15 s (`INTERACTIVE_TX`)    | 300 / 300                                                              | Entradas bien; la simulación se satura (11 req/s de capacidad contra ~85 pedidas) |
| **Pool de 20, espera de 15 s**                  | **300 / 300 en 28 s**                                                  | **0 errores**, 42 req/s, 362 mensajes y 60 fases guardadas                        |

Conclusiones:

- **Se corrigió un error real:** en la ola de entradas del inicio, crear equipo / unirse fallaba
  porque Prisma solo espera 2 s por una conexión libre. Ahora espera hasta 15 s.
- **La capacidad crece en proporción al pool** (5 → 20 conexiones: 11 → 42 req/s): el límite de esta
  prueba es la distancia casa → Virginia (~70 ms por consulta, 6-8 consultas por petición), no la
  base. Con el servidor junto a la base (Vercel iad1 o Azure East US, ~1-2 ms) cada petición debería
  tardar mucho menos; **falta confirmarlo corriendo el script contra el hosting real**.
- **El tiempo real importa:** con avisos, el chat y el tablero se refrescan cada 60 s en lugar de
  5-15 s: la carga baja de ~85 a ~15 req/s.
- **`DATABASE_POOL_MAX`:** en Vercel 3-5 por instancia (el pooler de Supabase acepta ~200 conexiones
  de cliente en los planes chicos y cada instancia abre las suyas); en una VM, 10-20.
