# Estado del hosting — Tabuleiro do Empreendedor

> Bitácora de hosting/infraestructura de la semana del hackathon (responsable: Brandon, con Claude
> como par de trabajo). Última actualización: **12 nov 2026, madrugada**. Documentación pura — no
> cambia código de producto.
>
> Documentos relacionados: `docs/backend/ESTADO-BACKEND.md` (sección 8.4 tenía el estado anterior
> de hosting, ya desactualizada en los puntos que este documento actualiza), `docs/database/
ESTADO-DATABASE.md`, `docs/prs/README.md`.

---

## 1. Resumen

| Tema                            | Estado al 12 nov                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| Hosting                         | Vercel, plan **Pro**, proyecto `tabuleiro-do-empreendedor`, región `iad1`                   |
| Dominio                         | `tabuleirodoempreendedor.com` (GoDaddy), conectado a Vercel, DNS verificado                 |
| Correo                          | Resend conectado al dominio; recuperar contraseña **sí funciona** en producción (ver abajo) |
| Control de gasto                | Spend Management: presupuesto **$20**, pausa automática **activada**                        |
| Base de datos (infraestructura) | Supabase, tier **Small** (ver `docs/database/ESTADO-DATABASE.md`)                           |
| Pipeline de despliegue          | `feature → dev → qa → main`; `main` es lo único que Vercel despliega a producción           |

---

## 2. Dominio y DNS (11 nov)

- Dominio `tabuleirodoempreendedor.com` comprado en GoDaddy, conectado como dominio de producción
  del proyecto en Vercel.
- Registros DNS configurados en GoDaddy (apuntando a Vercel) y verificados desde el panel de
  Vercel → Domains.
- `NEXT_PUBLIC_APP_URL` en Vercel actualizado al dominio real (antes apuntaba al subdominio
  `.vercel.app`).

## 3. Correo (Resend) — ya funciona en producción

`docs/backend/ESTADO-BACKEND.md` (10 nov) decía que **no habría correos en producción** porque no
había dominio, y que las contraseñas se cambiarían a mano con `pnpm staff:password`. **Esto ya no
aplica**: desde el 11-12 nov el dominio de correo está conectado a Resend
(`mail.tabuleirodoempreendedor.com`), así que "¿Olvidaste tu contraseña?" sí manda el correo real.

### Bug encontrado y corregido: `MAIL_FROM` vacío

Al revisar `apps/web/.env` para configurar esto se encontró `MAIL_FROM=` vacío — el código de envío
de correos (`lib/email/send.ts`) nunca lo validaba, así que fallaba en silencio. Se corrigió a:

```
MAIL_FROM="Tabuleiro do Empreendedor <no-reply@mail.tabuleirodoempreendedor.com>"
```

Verificado con un envío real de "olvidé mi contraseña" y revisando el panel de Resend → Emails: el
correo llegó con el remitente correcto.

**Queda vigente el script `pnpm staff:password`** (sección 6 de `ESTADO-BACKEND.md`) como respaldo
si el correo falla durante el evento o si un educador no tiene acceso a su bandeja.

## 4. Control de gasto (Spend Management)

- Vercel Pro incluye $20 de crédito por ciclo; se configuró además un **presupuesto de gasto por
  demanda de $20 con pausa automática** (Team Settings → Billing → Spend Management). Si el gasto
  por demanda llega a $20 **además** del crédito incluido, Vercel pausa todos los despliegues.
- **Esta cifra la fijó el scrum master del equipo, consultada y confirmada explícitamente la noche
  del 11-12 nov; se mantiene así por decisión suya**, incluso sabiendo que el evento es con
  300-500 personas en vivo por 24 horas. Documentado aquí para que quede constancia de quién tomó
  la decisión y cuándo, no para cuestionarla.
- Gasto registrado al momento de escribir esto: $0.76 de $20 de crédito incluido; presupuesto de
  pausa en $0 usado.

## 5. Variables de entorno en Vercel (Production)

Confirmadas presentes en Vercel → Settings → Environment Variables al 12 nov: `RESEND_API_KEY`,
`MAIL_FROM`, `NEXT_PUBLIC_APP_URL`, `REALTIME_PROVIDER`, `DATABASE_POOL_MAX`, `AUTH_SECRET`,
`DIRECT_URL`, `DATABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`.

También se agregaron estas mismas variables a `turbo.json` (`tasks.build.env`) — sin esa
declaración, Turborepo no las toma en cuenta para decidir si debe invalidar el caché de build, y un
cambio de variable en Vercel podía servir un build viejo cacheado. Corregido en el PR #27.

## 6. El pipeline de ramas protegidas — lo que se aprendió esta semana

`feature/* → dev → qa → main`. `dev` y `qa` **rechazan pushes directos** ("Changes must be made
through a pull request"); `main` exige **1 review aprobatorio de alguien distinto al autor del PR**
(el autor, aquí, siempre fue la cuenta de Brandon, así que necesitó que alguien más —
`tdoe871`, dueño de la organización— aprobara cada release).

### Problema recurrente: conflictos "add/add" entre ramas con el mismo contenido

Varias veces esta semana (PR #29→#30, PR #34→#35, y el PR #36 bloqueado por "out of date") GitHub
marcó conflicto o "rama desactualizada" entre dos ramas que en el fondo tenían **el mismo código**,
porque un merge anterior se hizo con una estrategia (squash) que genera un commit nuevo sin el
historial del otro lado como ancestro. Git ve historiales distintos aunque el contenido final sea
idéntico.

**Cómo se resolvió cada vez** (y cómo resolverlo si vuelve a pasar): crear una rama nueva desde la
rama "de adelante" (ej. `dev`), hacer `git merge origin/<rama-de-atrás>` ahí, resolver cualquier
conflicto quedándose con el lado ya probado (`git checkout --ours <archivo>`), confirmar con
`git diff origin/<rama-de-atrás> <rama-nueva> --stat` que el contenido queda idéntico al esperado,
correr la suite completa otra vez, y abrir un PR de esa rama hacia la rama "de atrás". Documentado
en detalle en `docs/prs/PR-30.md`, `PR-35.md` y `PR-37.md`.

### El botón "Update branch" de GitHub puede causar el mismo error

Dentro de un PR, el banner "This branch is out-of-date with the base branch" con el botón "Update
branch" intenta hacer un push directo a la rama de origen del PR. Si esa rama está protegida
(como `qa`), el botón falla con: `Couldn't update "qa": Changes must be made through a pull
request.` — no es un error de la app, es el botón equivocado. La solución es la del párrafo
anterior (un PR normal), nunca ese botón.

## 7. Qué no se alcanzó a probar en hosting

- **Nunca se corrió el script de prueba de carga (`pnpm load-test`, sección 10 de
  `ESTADO-BACKEND.md`) contra la URL real de producción** con la configuración actual de Vercel +
  Supabase. Se corrió una vez en la semana del 8 nov desde una máquina local contra Supabase
  directamente (300 participantes, 0 errores, ver esa sección), pero no replicado contra
  `tabuleirodoempreendedor.com` ni con el tráfico real de 300-500 personas del evento.
- No se probó qué pasa exactamente cuando el presupuesto de Spend Management se agota a la mitad
  del evento (si la pausa es instantánea o si da margen).
