# Estado del frontend — Tabuleiro do Empreendedor

> Bitácora del frontend de la semana del hackathon (responsable: Brandon, con Claude como par de
> trabajo). Cubre lo que se tocó entre el **11 y 12 de noviembre de 2026**, sobre el frontend que
> ya existía (conectado al backend de Eddy en el PR #18, 10 nov). Es documentación pura — no cambia
> código de producto.
>
> Documentos relacionados: `docs/backend/ESTADO-BACKEND.md` (contrato y estado del backend),
> `docs/hosting/ESTADO-HOSTING.md` (Vercel, dominio, correo), `docs/testing/QA-2026-11-12.md`
> (pruebas), `docs/prs/README.md` (un documento por PR).

---

## 1. Resumen

El frontend (Next.js 16, App Router, dentro de `apps/web`) ya estaba conectado a todo el backend
desde el PR #18 (10 nov, Brandon). El trabajo de esta semana fue **corregir bugs encontrados al
probar en celular y en producción real**, no reconstruir pantallas. Cuatro PRs, todos sobre `dev`:

| PR  | Qué corrigió                                                         | Fecha     |
| --- | -------------------------------------------------------------------- | --------- |
| #26 | Texto de "entrega guardada" desactualizado; botón de copiar link     | 11 nov    |
| #27 | Layout roto en celular (topbar, tabs de login); `turbo.json` sin env | 11-12 nov |
| #28 | Inputs con 13px (Safari hace zoom al enfocar); e2e desbloqueados     | 12 nov    |
| #33 | UI para que el educador pueda quitar a un mentor (ver sección 3)     | 12 nov    |

Detalle de cada uno en `docs/prs/`.

---

## 2. Bugs de celular encontrados y corregidos

Probado manualmente en el navegador contra viewports de celular (320px, 360px, Pixel 7) y luego
confirmado con Playwright en los mismos tamaños × 4 idiomas (`e2e-tests/mobile.spec.ts`).

### 2.1 Inputs hacían zoom en iPhone al tocarlos (PR #28)

`apps/web/src/app/globals.css`, regla `.field input, .field select, .field textarea`:

```diff
-    font-size: 13px;
+    /* 16px minimum: below that, Safari on iPhone zooms the page in on focus. */
+    font-size: 16px;
```

Safari en iOS hace zoom automático a la página cuando el usuario toca un campo con `font-size`
menor a 16px — es un comportamiento del navegador, no un bug de la app, pero rompía la experiencia
en celular. Confirmado corregido en vivo y con el test `inputs use at least 16px text so iPhones do
not zoom in on focus` (antes marcado `test.fail` como bug conocido; ahora pasa limpio).

### 2.2 Topbar y tabs de login rotos en pantallas angostas (PR #27)

`apps/web/src/app/globals.css`, dentro de `@media (max-width: 860px)`:

```diff
+    .login-panel::before { display: none; }       /* divisor entre columnas solo tiene sentido lado a lado */
+    .login-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
+    .login-tab { padding: 10px 4px; }
+    .topbar { height: auto; min-height: 52px; flex-wrap: wrap; row-gap: 6px; padding: 8px 16px; }
+    .tb-right { flex-wrap: wrap; row-gap: 6px; }
```

Las pestañas de login (Entrar / Crear cuenta / Código / Mentor) se encimaban en una sola fila que no
cabía en 320-360px; la barra superior (topbar) se cortaba. Se cambió a una cuadrícula de 2 columnas
y se permitió que la topbar crezca en altura en vez de recortarse.

### 2.3 Dos bugs que ya estaban resueltos sin que nadie se diera cuenta

Al revisar `mobile.spec.ts` para esta semana se encontraron 2 `test.fail(...)` (marcadores de bug
conocido) que **ya pasaban**, señal de que alguien los corrigió en un commit anterior sin quitar el
marcador: overflow de 5px en el login en francés a 320px, y el toast de "guardado localmente" que
ya decía otra cosa. Se quitaron los marcadores (PR #27/#28) para que el bug, si regresa, se note en
rojo en vez de quedar oculto como "falla esperada".

---

## 3. UI nueva: quitar a un mentor (PR #33, 12 nov)

Ver `docs/prs/PR-33.md` para el detalle completo (por qué, cómo se probó). Resumen de lo que se
agregó en `EducadorPanel.tsx`, dentro del modal de "Mentores":

- Lista de **mentores activos**, cada uno con un botón "Quitar" → confirmación en el mismo botón
  ("¿Seguro? Quitar", se cancela si se hace clic fuera) → al confirmar, llama
  `DELETE /api/events/:id/mentors/:mentorId` y refresca la lista de calificaciones.
- Estado vacío ("Nadie se ha unido todavía") cuando no hay mentores.
- Traducido en los 4 idiomas (`mentores.listaTitulo`, `nenhumMentor`, `remover`,
  `removerConfirmar`, `removido`, `equiposTitulo`).

### Bug propio, encontrado y corregido la misma noche

Al agregar esta UI se metió un encabezado de sección usando una clave de traducción equivocada
(`t("resumo.equipes")`, que no existe en el namespace `educador` — existe en `socializacao`, un
componente distinto). Se manifestó como `MISSING_MESSAGE` en el overlay de Next.js y texto crudo
`EDUCADOR.RESUMO.EQUIPES` en la pantalla. Se corrigió agregando la clave correcta
(`mentores.equiposTitulo`) en los 4 diccionarios y se volvió a probar en vivo antes de seguir. Ver
`docs/testing/QA-2026-11-12.md` sección 3.

---

## 4. Lo que se decidió mantener (no se tocó el diseño del product owner)

- **Las 7 ramas de diseño/UI de JP** (`feat/ui-sandbox-v3`, `v32`, `v33`, `v35`,
  `feat/ui-theme-sandbox-v1`, `v2`, `v25`) **no se integraron.** Decisión explícita de Brandon,
  tomada por tiempo: son un rediseño visual completo, no bugs puntuales, y mezclarlos esta semana
  hubiera significado volver a probar todo el frontend desde cero sin margen para hacerlo bien.
  Quedan para después del hackathon.
- El HTML/diseño original del product owner (el que ya estaba conectado desde el PR #18) **se dejó
  tal cual** en todo lo que no era un bug concreto. Los cambios de esta semana son correcciones
  (celular, copy desactualizado, la función de quitar mentor) sobre el mismo diseño, no un rediseño.
- La pantalla de "¿Olvidaste tu contraseña?" sigue mostrando el mensaje de "si el correo está
  registrado, te llegó un enlace" — esto ya **sí** aplica en producción porque el dominio de correo
  (Resend) se configuró esta semana (ver `docs/hosting/ESTADO-HOSTING.md`), a diferencia de lo que
  decía `ESTADO-BACKEND.md` sobre que no habría correos.

---

## 5. Qué no se alcanzó a probar

- **No se hizo una revisión de diseño/UX completa del frontend**, solo se corrigieron los bugs
  encontrados al probar manualmente y los que señaló el QA automatizado. No hubo tiempo en la
  semana para una auditoría visual exhaustiva de las ~15 pantallas de la app.
- Los navegadores probados fueron **Chromium** (Playwright) y Safari/Chrome reales en celular de
  forma manual. No se probó en Firefox ni en navegadores de Android distintos a Chrome.
