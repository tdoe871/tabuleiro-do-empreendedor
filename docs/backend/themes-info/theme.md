# Extracción y Arquitectura de Temas (Figma → `window.antigravityTheme` & Tailwind)

Documentación técnica sobre el proceso de extracción, traducción y homologación del sistema de diseño desde **Figma** hacia el monorepo de **Tabuleiro do Empreendedor**, incluyendo el contrato global de tematización dinámica `window.antigravityTheme` y la dirección visual **Modern Interactive Turquoise (`v2`)**.

---

## 1. Contrato Global `window.antigravityTheme`

En [`AntigravityThemeBridge.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/components/providers/AntigravityThemeBridge.tsx), la aplicación expone un puente global en `window.antigravityTheme` que permite inspeccionar, inyectar y restablecer tokens visuales en tiempo de ejecución sin mutar nodos del DOM ni la lógica de negocio de React:

- **`window.antigravityTheme.schema.tokens`**: Lista oficial de los 31 tokens soportados por el contrato.
- **`window.antigravityTheme.getTheme()`**: Devuelve el mapa actual de tokens activos.
- **`window.antigravityTheme.applyTheme(tokens)`**: Valida las claves contra `schema.tokens`, ignora claves no registradas y sincroniza las variables CSS (`--ag-*` y variables base `--bg`, `--bg2`, `--card`, `--t1`, `--border`, `--prob`, `--sol`, `--parc`, `--opor`, `--gold`).
- **`window.antigravityTheme.resetTheme()`**: Restaura el diseño original oscuro (`ORIGINAL_DARK_THEME`).
- **Evento de ciclo de vida**: Emite `antigravity:theme-ready` al inicializarse y `antigravity:theme-changed` tras cada actualización.

---

## 2. Dirección Visual: Modern & Interactive Turquoise (`TURQUOISE_MODERN_THEME`)

### 2.1 Superficies, Texto y Bordes (Glassmorphism Turquesa)

| Token (`schema.tokens`)   | Valor                      | Variable CSS                     | Propósito                                                      |
| :------------------------ | :------------------------- | :------------------------------- | :------------------------------------------------------------- |
| `colorBackground`         | `#04151f`                  | `--ag-color-background` / `--bg` | Fondo abisal turquesa nocturno con halos radiales interactivos |
| `colorSidebar`            | `rgba(6, 26, 38, 0.90)`    | `--ag-color-sidebar` / `--bg2`   | Barras laterales, cabeceras y modales con cristal esmerilado   |
| `colorSurface`            | `rgba(10, 38, 54, 0.78)`   | `--ag-color-surface` / `--card`  | Tarjetas principales translúcidas (`backdrop-blur-2xl`)        |
| `colorSurfaceSolid`       | `#0c2d40`                  | `--ag-color-surface-solid`       | Superficies secundarias y contenedores sólidos                 |
| `colorSurfaceInteractive` | `#113c54`                  | `--ag-color-surface-interactive` | Pasos en progreso y elementos interactivos                     |
| `colorSurfaceHover`       | `rgba(0, 245, 212, 0.12)`  | `--ag-color-surface-hover`       | Resplandor turquesa reactivo en hover                          |
| `colorSurfaceSelected`    | `rgba(0, 245, 212, 0.18)`  | `--ag-color-surface-selected`    | Pestañas activas y pasos seleccionados                         |
| `colorSurfaceFeatured`    | `rgba(14, 48, 66, 0.88)`   | `--ag-color-surface-featured`    | Bloques destacados (equipo, temporizador)                      |
| `colorText`               | `#ecfeff`                  | `--ag-color-text` / `--t1`       | Texto principal blanco-hielo turquesa de máximo contraste      |
| `colorTextMuted`          | `#88d4e3`                  | `--ag-color-text-muted` / `--t3` | Subtítulos, metadatos y etiquetas secundarias en aqua suave    |
| `colorBorder`             | `rgba(45, 212, 191, 0.24)` | `--ag-color-border` / `--border` | Bordes luminosos de cristal turquesa                           |

### 2.2 Acentos Semánticos, Las 4 Chaves y Avatares

| Token (`schema.tokens`) | Valor     | Equivalencia en Dominio                                     |
| :---------------------- | :-------- | :---------------------------------------------------------- |
| `colorAccent`           | `#00f5d4` | Turquesa Eléctrico — Botones primarios y **Solução**        |
| `colorOnAccent`         | `#031924` | Texto teal oscuro sobre botones turquesa de alto contraste  |
| `colorSuccess`          | `#2dd4bf` | Turquesa Esmeralda — Estados completados y **Problema**     |
| `colorInfo`             | `#00bbf9` | Cyan Laguna — Estados informativos y **Oportunidades**      |
| `colorSecondary`        | `#38bdf8` | Aqua Celeste — **Alianças / Parcerias**                     |
| `colorWarning`          | `#fbbf24` | Ámbar Dorado — Advertencias, temporizador y gemas           |
| `colorDisabled`         | `#476c7e` | Elementos bloqueados o deshabilitados                       |
| `colorAvatarStrategist` | `#00f5d4` | Rol RPG Estratega / Líder Comunitario (`lider_comunitario`) |
| `colorAvatarResearcher` | `#00bbf9` | Rol RPG Investigador (`pesquisador`)                        |
| `colorAvatarBuilder`    | `#2dd4bf` | Rol RPG Constructor (`jovem_empreendedor`)                  |
| `colorAvatarConnector`  | `#38bdf8` | Rol RPG Conector (`agente_saude`)                           |
| `radiusControl`         | `12px`    | Botones, inputs y selectores                                |
| `radiusCard`            | `20px`    | Tarjetas de llaves, métricas y modales                      |
| `radiusPill`            | `999px`   | Badges, etiquetas de fase y barras de progreso              |

---

## 3. Script de Inyección Directa (`applyReskin`)

```javascript
const applyReskin = () => {
  const bridge = window.antigravityTheme;

  if (!bridge) {
    window.addEventListener("antigravity:theme-ready", applyReskin, {
      once: true,
    });
    return;
  }

  bridge.applyTheme({
    colorBackground: "#04151f",
    colorSidebar: "rgba(6, 26, 38, 0.90)",
    colorSurface: "rgba(10, 38, 54, 0.78)",
    colorSurfaceSolid: "#0c2d40",
    colorSurfaceInteractive: "#113c54",
    colorSurfaceHover: "rgba(0, 245, 212, 0.12)",
    colorSurfaceSelected: "rgba(0, 245, 212, 0.18)",
    colorSurfaceFeatured: "rgba(14, 48, 66, 0.88)",

    colorText: "#ecfeff",
    colorTextMuted: "#88d4e3",
    colorBorder: "rgba(45, 212, 191, 0.24)",

    colorAccent: "#00f5d4",
    colorOnAccent: "#031924",
    colorSuccess: "#2dd4bf",
    colorInfo: "#00bbf9",
    colorSecondary: "#38bdf8",
    colorWarning: "#fbbf24",
    colorDisabled: "#476c7e",

    colorGradientStart: "rgba(4, 38, 54, 0.95)",
    colorGradientMiddle: "rgba(6, 28, 40, 0.94)",
    colorGradientEnd: "rgba(4, 21, 31, 1)",
    colorFocusRing: "rgba(0, 245, 212, 0.32)",
    colorSelectionGlow: "rgba(0, 245, 212, 0.28)",
    colorShadow: "rgba(2, 12, 18, 0.65)",

    colorAvatarStrategist: "#00f5d4",
    colorAvatarResearcher: "#00bbf9",
    colorAvatarBuilder: "#2dd4bf",
    colorAvatarConnector: "#38bdf8",

    radiusControl: "12px",
    radiusCard: "20px",
    radiusPill: "999px",
  });
};

applyReskin();
```

---

## 4. Pantallas Homologadas

1. **Sandbox de Diseño (`/es/sandbox-neon`)**: [`page.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/app/%5Blocale%5D/sandbox-neon/page.tsx)
2. **Portal de Acceso (`/es`)**: [`LoginScreen.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/features/auth/LoginScreen.tsx) y [`HeroConceitos.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/features/auth/HeroConceitos.tsx)
3. **Panel del Educador (`/es/mestre/dashboard`)**: [`EducadorPanel.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/features/event/EducadorPanel.tsx)
4. **Tablero del Jugador (`/es/jogador/dashboard`)**: [`PlayerBoard.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/features/event/PlayerBoard.tsx), [`SubmissionModal.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/features/event/SubmissionModal.tsx) y [`RolePickerModal.tsx`](file:///c:/Users/tproh/OneDrive/Documentos/My%20GitHub%20Projects/tabuleiro-do-empreendedor/apps/web/src/features/event/RolePickerModal.tsx)
