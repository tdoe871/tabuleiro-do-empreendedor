# Decisiones de UX — corrigiendo el prototipo

Tres problemas reales encontrados en `tdoe/` al revisarlo para un hackathon de 300 personas / 60 equipos. Ya están resueltos a nivel de esquema (`packages/db/prisma/schema.prisma`); falta construir la UI sobre ellos.

## 1. No hay dónde entregar el proyecto

El prototipo no tenía ningún campo de entrega. Se agregó `Submission` por equipo con `type`: `DEPLOY_LINK`, `REPO_LINK`, `FILE_OR_IMAGE` o `NONE`. Equipos con código pegan su link de deploy (si no funciona, es responsabilidad del equipo — así se hace en hackathons profesionales); equipos sin código adjuntan una presentación o imagen vía Supabase Storage.

## 2. Flujo de equipo confuso (elegir un número a ciegas)

Antes: el jugador entraba con el código de sesión y debía adivinar/escribir un número de equipo sin saber qué proyecto es cuál, con riesgo de que alguien entre al equipo equivocado.

Flujo nuevo:

1. El jugador entra con el **código del evento** + su nombre.
2. Pantalla siguiente: **crear equipo** o **unirse a un equipo**.
   - _Crear equipo_: elige un nombre real para el equipo → se vuelve **líder** automáticamente → recibe un link de invitación (`joinCode`) para compartir con el resto.
   - _Unirse a equipo_: ve la lista de **nombres reales** de equipos del evento (`GET /api/teams?eventCode=`) y entra con el código/link del líder — ya no hay números a ciegas.

Esto es lo que modela `Team.name` (único por evento) + `Team.joinCode` + `Participant.role` (`LEADER`/`MEMBER`).

## 3. Timer por fase en vez de timer general del evento

El prototipo original timeaba cada fase por separado. En un hackathon real el tiempo es uno solo para todo el evento. Se agregó `Event.timerMode`:

- `GLOBAL` (default): una sola cuenta regresiva desde `Event.startedAt` por `Event.durationMinutes`, válida para todo el evento.
- `PER_PHASE`: mantiene el comportamiento original (cada `Phase.durationMinutes`), por si algún maestro lo sigue queriendo para una clase normal (no para el hackathon).

El maestro elige el modo al crear el evento.
