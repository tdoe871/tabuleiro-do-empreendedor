# Contrato de la API — Tabuleiro do Empreendedor

> **Estado: BORRADOR para revisar con JP (frontend).** Nada de esto está implementado todavía,
> salvo `GET /api/health`. Lo marcado con ❓ es una decisión abierta; lo marcado con 🆕 es un
> endpoint que el frontend todavía no llama. Si algo no te cuadra, coméntalo en el PR.
>
> Responsable: Eddy (backend). Base: rama `dev` + PR #2 (esquema con 4 llaves × 3 fases).
>
> **Glosario.** El tablero tiene 4 **llaves** (etapas): Problema, Solución, Alianzas y
> Oportunidades. Cada llave tiene 3 **fases** (preguntas que contesta el equipo). En el código y en
> la API las llaves conservan los identificadores del prototipo (`problema`, `solucao`,
> `parcerias`, `oportunidades`), igual que los estados (`disponivel`, `ativa`, `concluida`,
> `bloqueada`); solo se usan como valores, no hay que traducirlos.

### Confirmado con JP (5 nov)

1. **El tablero llega ya armado** con la misma forma que el estado de `PlayerBoard`
   (`keys.problema.phases[1]`). La conversión la hace el backend.
2. **El avance entre llaves es automático.** Al concluir la 3.ª fase de una llave, el backend la
   marca `concluida` y activa la siguiente. No hay botón de "activar llave".
3. **Errores como código puro** (`TEAM_FULL`, etc.). JP los conecta con los diccionarios de i18n.
4. **Sesión del jugador por cookie.** El frontend no manda `teamId` ni `participantId` en el body.

---

## 1. Convenciones

- **Mismo origen.** Todo vive en `apps/web/src/app/api/*` (route handlers de Next.js). JSON en
  request y response.
- **Sesiones con cookie `httpOnly`** firmadas con `jose` (HS256, `AUTH_SECRET`). El frontend no
  las lee ni las manda a mano: `fetch` al mismo origen las incluye solo.
  - `tdoe_staff`: educador/staff. Dura 12 h.
  - `tdoe_player`: jugador. Lleva `participantId`, `teamId` y `eventId`. Dura 36 h (cubre el
    evento de 24 h).
- **La identidad sale siempre de la sesión, nunca del body.** El frontend no manda `teamId`,
  `participantId` ni `eventId` del jugador; el backend los toma de la cookie.
- **Errores como códigos** (la app tiene 4 idiomas, el frontend traduce):

  ```json
  { "error": "TEAM_FULL" }
  { "error": "VALIDATION_ERROR", "fields": { "nickname": "TOO_LONG" } }
  ```

  La lista completa está en la [sección 6](#6-códigos-de-error).

- **Fechas** en ISO 8601 UTC. Las respuestas que tienen timer incluyen `serverNow` para que el
  cliente calcule el tiempo restante sin depender del reloj del dispositivo.
- **Llaves en minúsculas** en la API (`problema`, `solucao`, `parcerias`, `oportunidades`), igual
  que `KEY_IDS` en `features/event/keys.ts`. En la base son el enum `BoardKey` en mayúsculas; la
  conversión la hace el backend.
- **Fases**: `order` 1-3 dentro de cada llave, igual que `numero` en `PlayerBoard`. El nombre y la
  pregunta salen de i18n (`jogador.fases.<llave>[order-1]`); la API no manda textos.

### Quién puede llamar cada endpoint

| Marca   | Significa                                                        |
| ------- | ---------------------------------------------------------------- |
| Público | Sin sesión                                                       |
| Staff   | Cookie `tdoe_staff` válida; además, el evento tiene que ser suyo |
| Jugador | Cookie `tdoe_player` válida                                      |
| Líder   | Jugador con `role = LEADER` en su equipo                         |

---

## 2. Endpoints que el frontend ya llama

### `POST /api/auth/register` — Público

Registro de educador (pestaña de registro del login).

```json
// request
{ "nome": "Ana", "sobrenome": "Souza", "email": "ana@ejemplo.com", "senha": "********" }
// 201 + cookie tdoe_staff
{ "staff": { "id": "uuid", "name": "Ana Souza", "email": "ana@ejemplo.com" } }
```

- **Implementado.** Errores: `VALIDATION_ERROR`, `EMAIL_TAKEN`, `RATE_LIMITED` (5 registros por
  IP cada 15 min).
- `fields` de `VALIDATION_ERROR`: `nome` / `sobrenome` → `REQUIRED` | `TOO_LONG` (máx. 60);
  `email` → `REQUIRED` | `INVALID`; `senha` → `REQUIRED` | `TOO_SHORT` (mín. 8) | `TOO_LONG`
  (máx. 128). El correo se guarda en minúsculas.
- ❓ **Decisión 6.2.1 del contexto:** el PM quiere que el líder del equipo se registre. Si el
  líder tiene cuenta con correo y contraseña, este endpoint cambia o aparece uno nuevo. Mientras
  no se decida, esto es solo para staff.

### `POST /api/auth/login` — Público

```json
// request
{ "email": "ana@ejemplo.com", "senha": "********" }
// 200 + cookie tdoe_staff
{ "staff": { "id": "uuid", "name": "Ana Souza", "email": "ana@ejemplo.com" } }
```

- **Implementado.** Errores: `INVALID_CREDENTIALS` (el mismo si el correo no existe o la
  contraseña está mal), `RATE_LIMITED` (10 intentos por IP cada 15 min), `VALIDATION_ERROR`
  (`email` o `senha` vacíos).
- Sin sesión de staff, cualquier página de `/[locale]/mestre/*` redirige al login (`/[locale]`).

### `POST /api/events` — Staff

El educador crea una sesión (`CreateSessionModal`).

```json
// request (lo que ya manda el frontend)
{ "titulo": "Hackathon MTY", "modo": "escolar", "cenario": null, "numEquipes": 60, "integrantes": 5 }
// 201
{ "event": EventDTO }
```

```ts
type EventDTO = {
  id: string;
  code: string; // 6 caracteres, sin I/O/0/1. Lo genera el BACKEND.
  name: string;
  mode: "escolar" | "personalizado";
  scenario: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
  timerMode: "GLOBAL" | "PER_PHASE";
  durationMinutes: number | null;
  maxTeams: number; // = numEquipes
  maxTeamSize: number; // = integrantes, de 2 a 5
  startedAt: string | null;
  endsAt: string | null;
};
```

- **Implementado.** Crea también las 12 fases estándar del tablero. Duración por defecto: 24 h
  (`durationMinutes: 1440`, timer `GLOBAL`).
- Errores: `UNAUTHORIZED`, `VALIDATION_ERROR` con `fields`: `titulo` → `REQUIRED` | `TOO_LONG`
  (máx. 120); `modo` → `INVALID`; `cenario` → `REQUIRED` | `TOO_LONG` (máx. 2000, solo en modo
  personalizado; en modo escolar se ignora); `numEquipes` → `REQUIRED` | `INVALID` (entero 1-200);
  `integrantes` → `REQUIRED` | `INVALID` (entero 2-5).
- **Cambio en el frontend:** hoy `CreateSessionModal` inventa el código con `randomCode()`. Tiene
  que usar `event.code` de la respuesta, porque es el que existe en la base.
- Mapeo de estados con `EduSession.status`: `aguardando` = `DRAFT`, `ativa` = `ACTIVE`,
  `pausada` = `PAUSED`. Falta `FINISHED` (el botón "terminar sesión" del mural).
- `modo` y `cenario` se guardan en `Event.mode` / `Event.scenario`. ❓ ¿Qué cambia en el juego con
  modo "personalizado" además de guardar el texto?

### `POST /api/teams` — Público (crea la sesión del jugador)

Crear equipo; quien lo crea queda como `LEADER`.

```json
// request (lo que ya manda el frontend)
{ "eventCode": "QATEST", "name": "Los Innovadores", "nickname": "Eddy" }
// 201 + cookie tdoe_player
{
  "team": { "id": "uuid", "name": "Los Innovadores", "joinCode": "K7XM2Q" },
  "participant": { "id": "uuid", "nickname": "Eddy", "role": "LEADER" }
}
```

- **Implementado.** Se puede crear equipo antes de que el educador inicie la sesión, mientras corre
  y en pausa; no cuando ya terminó.
- Errores: `EVENT_NOT_FOUND`, `EVENT_FINISHED`, `EVENT_FULL` (ya hay `maxTeams` equipos),
  `TEAM_NAME_TAKEN` (sin distinguir mayúsculas: "Los Innovadores" = "los innovadores"),
  `RATE_LIMITED`, `VALIDATION_ERROR` con `fields`: `eventCode` → `REQUIRED`; `name` →
  `REQUIRED` | `TOO_LONG` (máx. 40); `nickname` → `REQUIRED` | `TOO_LONG` (máx. 30).
- El código del evento se acepta en minúsculas o con espacios; el backend lo normaliza.
- `joinCode`: 6 caracteres, mismo alfabeto que el código del evento. El link de invitación sigue
  siendo `/team/join?code=<joinCode>`.
- **Cambio en el frontend:** hoy `team/create` solo muestra el código y el link en el caso 501.
  Con `201` tiene que usar `team.joinCode` de la respuesta para la misma pantalla.

### `GET /api/teams?eventCode=QATEST` — Público

Lista de equipos para que quien se une elija por nombre real.

```json
// 200
{ "teams": [{ "name": "Los Innovadores", "memberCount": 3, "maxTeamSize": 5 }] }
```

- **Implementado.** **Nunca devuelve `joinCode`** (cualquiera con el código del evento podría entrar
  a cualquier equipo). Para unirse hace falta el código que comparte el líder.
- Errores: `EVENT_NOT_FOUND`, `VALIDATION_ERROR` (`eventCode` vacío).

### `POST /api/participants` — Público (crea la sesión del jugador)

Unirse a un equipo.

```json
// request (lo que ya manda el frontend)
{ "teamJoinCode": "K7XM2Q", "nickname": "Ana" }
// 201 + cookie tdoe_player
{
  "team": { "id": "uuid", "name": "Los Innovadores" },
  "participant": { "id": "uuid", "nickname": "Ana", "role": "MEMBER" }
}
// 200 + cookie tdoe_player (ese nickname ya estaba en el equipo: recupera su lugar)
{ "team": { ... }, "participant": { ... }, "recovered": true }
```

- **Implementado.**
- **Volver a entrar:** si alguien pierde su sesión (otro celular, borró el navegador), entra otra vez
  con el código del equipo y **el mismo nickname** (sin importar mayúsculas) y recupera su lugar
  (`200` con `recovered: true`). Por eso no existe `NICKNAME_TAKEN`. Solo puede hacerlo quien tenga
  el código del equipo.
- Errores: `TEAM_NOT_FOUND` (código inválido o regenerado), `TEAM_FULL`, `EVENT_FINISHED`,
  `RATE_LIMITED`, `VALIDATION_ERROR` con `fields`: `teamJoinCode` → `REQUIRED`; `nickname` →
  `REQUIRED` | `TOO_LONG`.
- El límite de integrantes se valida dentro de una transacción con el equipo bloqueado, así que dos
  personas entrando al mismo tiempo no pueden pasarse de `maxTeamSize`.
- **Cambio en el frontend:** quien abre el link de invitación (`/team/join?code=...`) llega sin
  `nickname`, y hoy la página no tiene dónde escribirlo. Hace falta un campo de nickname en
  `team/join` cuando no viene en la URL.

### `PUT /api/submissions` — Jugador

Entrega del proyecto del equipo (`SubmissionModal`). Una entrega por equipo; cada `PUT` la
reemplaza. **Implementado.**

```json
// request (lo que ya manda el frontend, más `links` opcional)
{ "type": "DEPLOY_LINK", "url": "https://mi-app.vercel.app", "links": ["https://github.com/equipo/app"], "description": "..." }
// 200 (mismo cuerpo que GET /api/submissions)
{
  "submission": { "type": "DEPLOY_LINK", "url": "https://mi-app.vercel.app/", "links": ["https://github.com/equipo/app"], "description": "...", "submittedAt": "2026-11-13T10:00:00Z" },
  "files": [ SubmissionFileDTO ]
}
```

```ts
type SubmissionFileDTO = {
  id: string;
  fileName: string; // nombre original
  contentType: string;
  size: number; // bytes
  downloadUrl: string; // "/api/submissions/files/<id>" (redirige a una URL firmada de 60 s)
};
```

- `type`: `DEPLOY_LINK` | `REPO_LINK` | `FILE_OR_IMAGE` | `NONE`.
- `url` (link principal) obligatorio con `DEPLOY_LINK` y `REPO_LINK`. `links`: hasta 5 links extra
  (otras páginas, presentación, video). Todos tienen que ser `https://`.
- `FILE_OR_IMAGE` necesita al menos un archivo ya subido (ver "Archivos de la entrega" abajo). Los
  archivos pertenecen al equipo, no a un `type`: un equipo puede entregar un link **y** archivos.
- Cualquier miembro puede entregar, mientras la sesión está `ACTIVE` y con tiempo.
- Errores: `UNAUTHORIZED`, `EVENT_NOT_ACTIVE` (sin iniciar o en pausa), `DEADLINE_PASSED` (se acabó
  el tiempo o el evento terminó), `VALIDATION_ERROR` con `fields`: `type` → `INVALID`; `url` →
  `REQUIRED` | `INVALID_URL`; `links` → `INVALID` (no es lista o son más de 5) | `INVALID_URL`;
  `description` → `TOO_LONG` (máx. 2000); `files` → `REQUIRED` (`FILE_OR_IMAGE` sin archivos).

### `GET /api/submissions` — Jugador

La entrega del equipo y sus archivos: `{ "submission": ... | null, "files": [SubmissionFileDTO] }`.
**Implementado.** `GET /api/board` también trae `submission` y `files`.

### `GET /api/phases?eventId=` → reemplazado por `GET /api/board`

El frontend todavía no lo llama. Propongo **no implementarlo** y usar `GET /api/board` (abajo),
porque el jugador no debería mandar `eventId` (sale de su sesión) y el tablero necesita más que
las fases.

### `GET /api/health` — Público

Ya implementado. Sin datos sensibles.

---

## 3. Endpoints nuevos para el jugador 🆕

**Implementados** (salvo los de entregas). Defaults que se tomaron mientras no haya otra decisión;
cualquiera se puede cambiar después sin rehacer nada:

- Cualquier miembro del equipo puede contestar fases; una fase concluida ya no se edita.
- Puntos por fase: **0** por ahora (`POINTS_PER_PHASE` en `features/event/server/board.ts`;
  cambiar ese número basta para empezar a dar puntos).
- Dos miembros pueden tener el mismo rol del juego de rol.
- El tablero solo avanza con la sesión `ACTIVE` y tiempo restante (en pausa o con el tiempo
  agotado responde `EVENT_NOT_ACTIVE` / `EVENT_FINISHED`).
- Se guarda quién contestó cada fase (`TeamPhase.completedById`), para el registro de actividad.
- Sin sesión de jugador, cualquier página de `/[locale]/jogador/*` redirige al login (`/[locale]`).

### `GET /api/board` — Jugador

Todo lo que necesita `PlayerBoard` en una sola llamada, ya con la forma de su estado local para
que no haya que convertir nada.

```json
{
  "serverNow": "2026-11-12T15:00:00Z",
  "event": {
    "code": "QATEST",
    "name": "...",
    "status": "ACTIVE",
    "timerMode": "GLOBAL",
    "startedAt": "...",
    "endsAt": "..."
  },
  "team": {
    "id": "uuid",
    "name": "Los Innovadores",
    "joinCode": "K7XM2Q",
    "score": 0
  },
  "me": {
    "id": "uuid",
    "nickname": "Eddy",
    "role": "LEADER",
    "rpgRole": "pesquisador"
  },
  "members": [
    { "id": "uuid", "nickname": "Ana", "role": "MEMBER", "rpgRole": null }
  ],
  "keys": {
    "problema": {
      "status": "ativa",
      "phases": {
        "1": { "status": "concluida", "conteudo": "...", "completedAt": "..." },
        "2": { "status": "disponivel" },
        "3": { "status": "bloqueada" }
      }
    },
    "solucao": {
      "status": "bloqueada",
      "phases": {
        "1": { "status": "disponivel" },
        "2": { "status": "bloqueada" },
        "3": { "status": "bloqueada" }
      }
    }
  },
  "cartaAtiva": { "key": "problema", "text": "..." },
  "submission": null,
  "files": []
}
```

- `keys.*.status`: `ativa` | `concluida` | `bloqueada`. `KeyStatus` en el frontend hoy es
  `disponivel` | `ativa` | `concluida`: hay que **agregar `bloqueada`** para las llaves a las que el
  equipo todavía no llega (con el avance automático ya no hay llaves "disponibles para elegir").
- `phases.*.status`: `bloqueada` | `disponivel` | `concluida` (igual que `PhaseStatus`).
- Las 4 llaves siempre vienen en el objeto, cada una con sus 3 fases.
- Sustituye los miembros de prueba (`["Ana", "Bruno", "Carla"]`) y el `nickname` que hoy llega por
  la URL: el dashboard ya no necesita `?nickname=`. `me` es el jugador; `members` son los demás.
- `event.playable`: `true` si ahora mismo se puede contestar (sesión activa y con tiempo). Sirve para
  deshabilitar los botones en pausa.
- `cartaAtiva` llega siempre `null` hasta que se defina la carta de reto.
- Errores: `UNAUTHORIZED` (sin sesión de jugador → mandar al login).

### Cómo avanza el tablero (lo calcula el backend)

No hay endpoint para activar una llave: el estado se calcula a partir de las fases concluidas.

- Las llaves van en orden fijo: Problema → Solución → Alianzas → Oportunidades.
- Al inicio, `problema` está `ativa` con la fase 1 `disponivel`; las otras 3 llaves están
  `bloqueada`.
- Dentro de la llave activa, concluir la fase N libera la N+1.
- Al concluir la fase 3, la llave pasa a `concluida` y la siguiente pasa a `ativa` con su fase 1
  `disponivel`, en la misma respuesta.
- Cuando las 4 están `concluida`, el tablero está completo (el frontend ya muestra la entrega).
- Esto reemplaza `ativarChave` del prototipo y su botón. En el prototipo, después de Problema el
  equipo elegía el orden de las otras 3; con el avance automático el orden es fijo.
- `TeamPhase.keyActivated` se quitó del esquema: la llave activa es la primera no concluida.

### `PUT /api/board/keys/:key/phases/:order` — Jugador

Guardar la respuesta de una fase y concluirla (`concluirFase`). Libera la siguiente fase, o la
siguiente llave si era la fase 3. Responde el tablero completo (`200`, mismo cuerpo que
`GET /api/board`), así el frontend reemplaza su estado sin calcular nada.

```json
// request
{ "conteudo": "El problema ocurre en..." }
```

- Errores: `UNAUTHORIZED`, `KEY_LOCKED` (llave todavía bloqueada), `PHASE_LOCKED`,
  `EVENT_NOT_ACTIVE`, `EVENT_FINISHED`, `VALIDATION_ERROR` con `fields`: `key` / `order` →
  `INVALID`; `conteudo` → `REQUIRED` | `TOO_LONG` (máx. 5000).
- Si la fase ya estaba concluida (por ejemplo, dos miembros al mismo tiempo), responde `200` con el
  tablero actual; no es error ni sobrescribe la respuesta.

### `PUT /api/participants/me/rpg-role` — Jugador

Elegir o cambiar el rol del juego de rol (`RolePickerModal`). Los valores son los identificadores
de `rpgRoles.ts`.

```json
// request
{ "rpgRole": "pesquisador" }   // agente_saude | lider_comunitario | jovem_empreendedor | pesquisador
// 200
{ "rpgRole": "pesquisador" }
```

- `"rpgRole": null` quita el rol. Dos miembros pueden tener el mismo.
- Errores: `UNAUTHORIZED`, `VALIDATION_ERROR` (`rpgRole` → `INVALID`).

### `POST /api/teams/me/join-code` — Líder

Regenera el código de invitación; el anterior deja de servir.

```json
// 200
{ "joinCode": "P4WN8D" }
```

- Los miembros que ya entraron conservan su sesión.
- Errores: `UNAUTHORIZED`, `FORBIDDEN` (no es líder).

### Archivos de la entrega — Jugador

**Implementado.** Los archivos se suben **directo del navegador a Supabase Storage** (bucket privado
`submissions`) con una URL de un solo uso; nuestro servidor no recibe el archivo. Son 3 pasos:

```json
// 1. POST /api/submissions/files
{ "fileName": "Propuesta Final.pdf", "contentType": "application/pdf", "size": 2400000 }
// 201
{ "file": { ...SubmissionFileDTO, "status": "PENDING" }, "uploadUrl": "https://<proyecto>.supabase.co/storage/v1/object/upload/sign/..." }

// 2. PUT <uploadUrl>  — body: el archivo; header Content-Type: el mismo contentType del paso 1

// 3. POST /api/submissions/files/:id/confirm
// 200
{ "file": { ...SubmissionFileDTO, "status": "READY" } }
```

- En el paso 3 el backend revisa **el contenido real** del archivo (sus primeros bytes), no solo el
  nombre: un HTML renombrado a `.pdf` se rechaza y se borra. Confirmar dos veces no es error.
- Permitidos (por defecto, se cambian en `features/submission/server/rules.ts`): PDF, Word (`.doc`,
  `.docx`), PowerPoint (`.ppt`, `.pptx`) e imágenes (`.png`, `.jpg`, `.webp`). Máximo **20 MB** por
  archivo y **5 archivos** por equipo. Storage también rechaza otros tipos y tamaños por su cuenta.
- Una subida que no se confirma en 1 hora se descarta sola.
- Errores del paso 1: `FILE_TYPE_NOT_ALLOWED` (extensión no permitida o que no coincide con
  `contentType`), `FILE_TOO_LARGE`, `TOO_MANY_FILES`, `EVENT_NOT_ACTIVE`, `DEADLINE_PASSED`,
  `VALIDATION_ERROR` (`fileName` / `contentType` → `REQUIRED`, `size` → `INVALID`).
- Errores del paso 3: `FILE_NOT_FOUND`, `FILE_NOT_UPLOADED` (todavía no se subió nada),
  `FILE_TYPE_NOT_ALLOWED` (el contenido no corresponde), `FILE_TOO_LARGE`, `EVENT_NOT_ACTIVE`,
  `DEADLINE_PASSED`.

`DELETE /api/submissions/files/:id` — un miembro del equipo borra un archivo (`204`), mientras la
entrega esté abierta. Errores: `FILE_NOT_FOUND`, `EVENT_NOT_ACTIVE`, `DEADLINE_PASSED`.

`GET /api/submissions/files/:id` — descarga. Redirige (`307`) a una URL firmada que vence en 60 s y
baja el archivo con su nombre original. Pueden descargar los miembros del equipo y el educador
dueño del evento (también después de que termina). Errores: `UNAUTHORIZED`, `FILE_NOT_FOUND`.

### Chat del equipo — Jugador

**Implementado.** Reemplaza el chat que hoy vive solo en el estado local de `PlayerBoard`. Tres
tipos de mensaje:

| `type`    | En `PlayerBoard`  | Lo ven                                |
| --------- | ----------------- | ------------------------------------- |
| `TEAM`    | `balao`           | Todo el equipo                        |
| `PRIVATE` | `sussurro`        | Solo quien lo manda y quien lo recibe |
| `NUDGE`   | `cutucar` (toque) | Solo quien lo manda y quien lo recibe |

Los avisos de `sistema` (fase concluida, etc.) siguen siendo locales: no pasan por la API.

`POST /api/messages` — manda un mensaje.

```json
{ "type": "TEAM", "text": "¿Quién toma la fase 2?", "clientId": "6f1c2a9e-3b7d-4c1a-9e8f-2d4b6a8c0e1f" }
{ "type": "PRIVATE", "text": "...", "toParticipantId": "uuid", "clientId": "..." }
{ "type": "NUDGE", "toParticipantId": "uuid", "clientId": "..." }
// 201 (o 200 si ese clientId ya se había mandado)
{ "message": MessageDTO }
```

```json
// MessageDTO
{
  "id": 42,
  "type": "PRIVATE",
  "text": "...",
  "from": { "id": "uuid", "nickname": "Ana" },
  "to": { "id": "uuid", "nickname": "Bruno" },
  "mine": true,
  "clientId": "...",
  "createdAt": "2026-11-12T15:00:00.000Z"
}
```

- **`clientId`**: lo genera el navegador (`crypto.randomUUID()`), de 8 a 64 caracteres
  (letras, números, `-` y `_`). Si se reintenta con el mismo `clientId` (se cortó la conexión), el
  backend responde el mensaje que ya guardó y no lo duplica.
- `text`: obligatorio en `TEAM` y `PRIVATE`, máximo **1000** caracteres; en `NUDGE` se ignora.
- `toParticipantId`: obligatorio en `PRIVATE` y `NUDGE`; tiene que ser otro miembro del mismo
  equipo. Sale de `members[].id` de `GET /api/board`.
- Se puede mandar mientras la sesión está `ACTIVE` y con tiempo (igual que el tablero). Leer se
  puede siempre, también en pausa y al terminar.
- Límites: **30 mensajes por minuto** por jugador, y **un toque cada 30 s** a la misma persona.
- `from` / `to` llegan `null` si ese participante ya no existe.
- Errores: `UNAUTHORIZED`, `VALIDATION_ERROR` (`type` → `INVALID`, `text` → `REQUIRED` /
  `TOO_LONG`, `toParticipantId` → `REQUIRED` / `INVALID`, `clientId` → `INVALID`),
  `EVENT_NOT_ACTIVE`, `EVENT_FINISHED`, `RATE_LIMITED`.

`GET /api/messages` — los mensajes que el jugador puede ver, **del más viejo al más nuevo**.

| Query          | Devuelve                                                |
| -------------- | ------------------------------------------------------- |
| (nada)         | Los últimos 100 (al abrir el tablero)                   |
| `?after=<id>`  | Los más nuevos que `id`, hasta 100 (para refrescar)     |
| `?before=<id>` | Los más viejos que `id`, hasta 100 (historial anterior) |

```json
{ "serverNow": "...", "messages": [MessageDTO], "hasMore": false, "cursor": 42 }
```

- **Cómo refrescar:** guardar `cursor` y pedir `?after=<cursor>` cada pocos segundos. Si
  `hasMore` es `true`, pedir otra vez enseguida.
- Con la carga inicial o con `?before=`, `hasMore: true` quiere decir que hay mensajes más viejos
  (pedirlos con `?before=<id del primero>`). Con `?before=`, `cursor` llega `null`.
- **Juntar por `id`:** el mensaje propio llega en la respuesta del `POST` y otra vez en un
  refresco; no hay que pintarlo dos veces.
- Un mensaje tarda **1 segundo** en aparecer en `GET` (evita que un refresco se salte un mensaje
  que se estaba guardando al mismo tiempo). Quien lo manda lo ve al instante por la respuesta del
  `POST`.
- Errores: `UNAUTHORIZED`, `VALIDATION_ERROR` (`query` → `INVALID`).

### `POST /api/auth/logout` — Staff o Jugador

Borra las cookies de educador y de jugador. `204`. **Implementado.**

---

## 4. Endpoints nuevos para el educador 🆕

### `GET /api/events` — Staff

Las sesiones del educador para la barra lateral de `EducadorPanel`, de la más nueva a la más
vieja. **Implementado.** Cada educador solo ve las suyas.

```json
{ "events": [ EventDTO ] }
```

### `PATCH /api/events/:id/status` — Staff

Botón iniciar / pausar / retomar, y "terminar sesión".

```json
// request
{ "status": "ACTIVE" }   // ACTIVE | PAUSED | FINISHED
// 200
{ "event": EventDTO }
```

- **Implementado.** Transiciones:
  - `DRAFT` → `ACTIVE`: se fija `startedAt`; con timer `GLOBAL`, `endsAt = startedAt + durationMinutes`.
  - `ACTIVE` → `PAUSED` → `ACTIVE`: **el reloj no se detiene** (`endsAt` no cambia). Mientras está en
    pausa, los participantes no pueden avanzar en el tablero ni entregar (`EVENT_NOT_ACTIVE`).
    Confirmado con el PM (5 nov).
  - Cualquiera → `FINISHED`: termina el evento; `endsAt` pasa a ser ahora (si era más tarde).
  - Pedir el estado que ya tiene responde `200` sin cambiar nada (doble clic seguro).
- Errores: `UNAUTHORIZED`, `VALIDATION_ERROR` (`status` inválido), `EVENT_NOT_FOUND` (no existe o
  es de otro educador), `INVALID_STATUS_TRANSITION` (por ejemplo, `DRAFT` → `PAUSED` o salir de
  `FINISHED`).

### `GET /api/events/:id/overview` — Staff

Métricas, equipos y alertas para `EducadorPanel` y `SocializacaoPanel`, en una sola consulta
agregada (sin N+1). **Implementado.** Mientras no exista el bloque de equipos, `teams` llega vacío.

```json
{
  "serverNow": "...",
  "event": EventDTO,
  "metrics": { "activeTeams": 58, "participants": 271, "keysCompleted": 103 },
  "teams": [
    {
      "id": "uuid",
      "name": "Los Innovadores",
      "memberCount": 4,
      "score": 0,
      "keys": { "problema": "concluida", "solucao": "ativa", "parcerias": "bloqueada", "oportunidades": "bloqueada" },
      "submission": { "type": "DEPLOY_LINK", "url": "https://...", "description": "...", "submittedAt": "..." }
    }
  ],
  "alerts": [ { "id": "uuid", "severity": "WARNING", "message": "...", "createdAt": "..." } ]
}
```

- `metrics.activeTeams`: equipos con al menos un integrante. `keysCompleted`: total de llaves
  concluidas sumando todos los equipos.
- `submission` es `null` hasta que el equipo entrega. El archivo subido no viene aquí; su descarga
  con URL firmada llega con el bloque de entregas.
- `alerts`: solo las no resueltas. Qué las genera sigue pendiente (ver Alertas ❓).
- Errores: `UNAUTHORIZED`, `EVENT_NOT_FOUND` (no existe o es de otro educador).

- El mural (`SocializacaoPanel`) usa `"pendente"` para las llaves bloqueadas. Propongo que la API
  use los mismos estados que el tablero (`ativa` / `concluida` / `bloqueada`) y
  que el mural los pinte como quiera.
- ❓ El campo `proposta` del mural (la propuesta del equipo): ¿es la descripción de la entrega o algo aparte?

### Timer del educador ❓

`EducadorPanel` tiene un timer con presets, iniciar/parar y "mostrar a los estudiantes", aparte del
timer global del evento (24 h). Antes de definir el endpoint hay que aclarar qué es:

- **Opción A:** cuenta regresiva corta para una actividad (por ejemplo, 15 min de pitch). Se guarda
  en el evento (`activityEndsAt`, `activityVisible`) y los jugadores la ven en `GET /api/board`.
- **Opción B:** es el mismo timer global y los presets solo eligen la duración del evento.

### Carta de reto ❓

El educador lanza una carta de reto para una llave y la quita.

```json
// PUT /api/events/:id/challenge-card
{ "key": "problema", "text": "..." }
// DELETE /api/events/:id/challenge-card → 204
```

Los jugadores la reciben en `GET /api/board` como `cartaAtiva`. ❓ ¿Una sola carta activa por
evento, o una por llave? ¿Se manda a todos los equipos o a uno en particular?

### Alertas ❓

`GET /api/events/:id/alerts` y `PATCH /api/alerts/:id/resolve`. ❓ ¿Qué genera una alerta en el
prototipo ("alertas de mediação")? ¿Equipo sin avanzar X minutos, equipo sin miembros, otra cosa?

### Exportar ❓

"Reporte" y "exportar propuestas": `GET /api/events/:id/export?type=report|proposals` → CSV.
Se define cuando el resto esté funcionando.

---

## 5. Tiempo real

**Implementado del lado del backend.** Cuando algo cambia, el backend manda un **aviso sin datos**
("cambió el chat", "cambió el tablero"); la pantalla vuelve a pedir lo que muestra a la API de
siempre, que revisa la sesión. Si el tiempo real no está disponible, la pantalla refresca sola cada
pocos segundos: funciona igual, solo más lento.

### Para el frontend: `useRealtime`

```tsx
import { useRealtime } from "@/lib/realtime/useRealtime";

// Jugador (PlayerBoard)
const { connected } = useRealtime((signal) => {
  if (signal === "messages" || signal === "refresh") loadNewMessages(); // GET /api/messages?after=<cursor>
  if (signal !== "messages") loadBoard(); // GET /api/board
});

// Educador (EducadorPanel)
useRealtime(() => loadOverview(), { eventId }); // GET /api/events/:id/overview
```

| Aviso      | Cuándo                                                                                     | Quién lo recibe    | Qué volver a pedir                 |
| ---------- | ------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------- |
| `messages` | Mensaje nuevo en el chat                                                                   | El equipo          | `GET /api/messages?after=<cursor>` |
| `board`    | Fase concluida, entrega o archivo, nuevo integrante, rol, nuevo código del equipo          | El equipo          | `GET /api/board`                   |
| `event`    | El educador inicia, pausa, retoma o termina la sesión                                      | Todos en el evento | `GET /api/board` o el resumen      |
| `overview` | Cualquier cambio que afecta el resumen (equipos, fases, entregas, estado)                  | El educador        | `GET /api/events/:id/overview`     |
| `refresh`  | Lo genera el propio hook: refresco periódico, pestaña visible otra vez, internet de vuelta | —                  | Todo lo que muestra la pantalla    |

- El hook junta avisos seguidos: diez mensajes en un segundo producen una sola llamada.
- `connected` es `true` mientras llegan avisos en vivo (se puede mostrar un indicador). Conectado,
  refresca cada 60 s por seguridad; desconectado, cada 5 s.
- Un `401` en la llamada que hace la pantalla sigue significando "mandar al login".

### `GET /api/realtime` — Jugador o Staff

Lo usa el hook; el frontend no necesita llamarlo directo. Jugador: sin query. Educador:
`?eventId=<id>` de uno de sus eventos.

```json
{
  "provider": "supabase",
  "supabase": {
    "url": "https://<proyecto>.supabase.co",
    "key": "sb_publishable_..."
  },
  "topics": ["tdoe:team:...", "tdoe:event:..."],
  "pollMs": { "connected": 60000, "disconnected": 5000 }
}
```

- `provider`: `supabase` (Supabase Broadcast) o `none` (solo refresco). Se elige con la variable
  `REALTIME_PROVIDER` del servidor, sin cambiar código. `socketio` está reservado para el plan de
  servidor propio y todavía no está implementado.
- Los nombres de canal van firmados con `AUTH_SECRET`: con el id de un equipo no se puede adivinar
  su canal, y los jugadores nunca reciben el canal del educador.
- Errores: `UNAUTHORIZED`, `EVENT_NOT_FOUND` (evento de otro educador).

---

## 6. Códigos de error

| Código                      | HTTP | Cuándo                                                           |
| --------------------------- | ---- | ---------------------------------------------------------------- |
| `VALIDATION_ERROR`          | 400  | Body inválido. Trae `fields` con el detalle por campo            |
| `FILE_TYPE_NOT_ALLOWED`     | 400  | Tipo de archivo no permitido                                     |
| `FILE_TOO_LARGE`            | 400  | Archivo más grande que el límite                                 |
| `UNAUTHORIZED`              | 401  | Sin sesión o sesión vencida                                      |
| `INVALID_CREDENTIALS`       | 401  | Login fallido                                                    |
| `FORBIDDEN`                 | 403  | Tiene sesión pero no permiso (no es líder, evento de otro staff) |
| `EVENT_NOT_FOUND`           | 404  | Evento inexistente, o de otro educador                           |
| `TEAM_NOT_FOUND`            | 404  | Código de equipo inválido o regenerado                           |
| `FILE_NOT_FOUND`            | 404  | Archivo inexistente o de otro equipo                             |
| `EMAIL_TAKEN`               | 409  | Correo ya registrado                                             |
| `TEAM_NAME_TAKEN`           | 409  | Ya hay un equipo con ese nombre en el evento                     |
| `TEAM_FULL`                 | 409  | El equipo llegó a `maxTeamSize`                                  |
| `EVENT_FULL`                | 409  | El evento llegó a `maxTeams`                                     |
| `EVENT_NOT_ACTIVE`          | 409  | El evento está en `DRAFT` o `PAUSED`                             |
| `EVENT_FINISHED`            | 409  | El evento terminó                                                |
| `DEADLINE_PASSED`           | 409  | Pasó la hora límite de entrega                                   |
| `FILE_NOT_UPLOADED`         | 409  | Se confirmó un archivo que todavía no se subió                   |
| `TOO_MANY_FILES`            | 409  | El equipo ya tiene el máximo de archivos                         |
| `KEY_LOCKED`                | 409  | La llave todavía está bloqueada                                  |
| `PHASE_LOCKED`              | 409  | Fase bloqueada (falta concluir la anterior)                      |
| `INVALID_STATUS_TRANSITION` | 409  | Cambio de estado del evento no permitido                         |
| `RATE_LIMITED`              | 429  | Demasiados intentos                                              |
| `INTERNAL_ERROR`            | 500  | Error del servidor (el detalle solo va a los logs)               |

`501 not_implemented` desaparece endpoint por endpoint a medida que se implementan.

---

## 7. Pendiente de decidir con el equipo (no está en este contrato)

- **Chat:** ¿el educador (o un mentor) puede leer los mensajes del equipo, para moderar? Hoy no.
- **Tiempo real** (decisión 6.2.5): Supabase Broadcast desde el servidor u otra opción. Mientras
  tanto, el frontend puede refrescar `GET /api/board` cada 10-15 s.
- **Mentores y calificación** (decisión 6.2.3): no hay rol ni modelo todavía.
- **Registro del líder** (decisión 6.2.1).

---

## 8. Resumen de cambios para el frontend

1. `CreateSessionModal`: usar `event.code` de la respuesta en vez de `randomCode()`.
2. `team/create`: con `201`, mostrar el código y el link usando `team.joinCode` de la respuesta.
3. `team/join`: agregar campo de nickname cuando no viene en la URL (link de invitación).
4. `PlayerBoard`: cargar todo de `GET /api/board` (sin `?nickname=` en la URL y sin miembros de
   prueba) y mandar las acciones a los endpoints de la sección 3. Al concluir una fase, reemplazar
   el estado con el tablero que regresa la respuesta.
5. `PlayerBoard`: quitar el botón de activar llave (`ativarChave`) y agregar `bloqueada` a
   `KeyStatus`; el avance entre llaves lo hace el backend.
6. `EducadorPanel` / `SocializacaoPanel`: cargar de `GET /api/events` y
   `GET /api/events/:id/overview`.
7. Traducir los códigos de error de la sección 6 en los 4 diccionarios.
8. Si una llamada responde `401`, mandar al login (`/[locale]`) tanto al jugador como al educador.
9. `SubmissionModal`: para archivos, seguir los 3 pasos de "Archivos de la entrega" (pedir URL,
   subir directo a Storage, confirmar). Mostrar la lista de `files` con su `downloadUrl` y un botón
   para borrar. Opcional: un campo para los links extra (`links`).
10. `PlayerBoard` (chat): mandar `balao`, `sussurro` y `cutucar` con `POST /api/messages`
    (`TEAM`, `PRIVATE`, `NUDGE`) usando los `id` de `members` en vez de los nombres, y cargar la
    conversación con `GET /api/messages` + `?after=<cursor>`. Juntar por `id`.
11. `PlayerBoard` y `EducadorPanel`: usar `useRealtime` (sección 5) para volver a pedir el chat, el
    tablero o el resumen cuando llegue un aviso, en vez de refrescar con un temporizador propio.
