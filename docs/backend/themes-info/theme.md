# Extracción y Arquitectura del Tema Dark Glass (Figma → Tailwind)

Documentación técnica sobre el proceso de extracción, traducción y homologación del sistema de diseño desde **Figma** hacia el monorepo de **Tabuleiro do Empreendedor**, aplicando el paradigma **Dark Glassmorphism Futurista**.

---

## 1. Contexto y Origen del Diseño

A partir del prototipo interactivo en Figma (`node-id=2004-8927`), se realizó un análisis estructural de componentes, jerarquía de pantallas y patrones de experiencia de usuario (UX) para eventos de emprendimiento y hackathons en tiempo real.

En lugar de copiar valores CSS estáticos de Figma, se adoptó una metodología de **Reskin Estructural**:

1. **Extracción Anatómica:** Se conservó la disposición del layout de Figma (barra lateral con equipo, cabecera de saludo con timer/XP y la cuadrícula de 4 cuadrantes).
2. **Aplicación del Sistema de Tokens:** Se sustituyeron los estilos crudos por el lenguaje de diseño propio del proyecto (**Dark Glassmorphism** con acentos neón y elevaciones con `backdrop-blur`).
3. **Desacoplamiento Funcional:** Se preservó al 100% la lógica de React (estados, temporizadores, canales de comunicación en tiempo real y llamadas a API).

---

## 2. Tokens de Diseño Extraídos

### 2.1 Superficies y Efecto Glass (Vidrio Esmerilado)

El sistema sustituye las superficies planas opacas (`bg-gray-800` / `#1c1e26`) por capas traslúcidas que dejan filtrar la luz ambiental de fondo:

| Propiedad               | Valor Tailwind / CSS          | Propósito                                          |
| :---------------------- | :---------------------------- | :------------------------------------------------- |
| **Canvas Principal**    | `bg-[#08090D]`                | Fondo oscuro absoluto para contraste con neón      |
| **Superficie Glass**    | `bg-[#14161C]/80`             | Contenedores principales, tarjetas y sidebars      |
| **Desenfoque de Fondo** | `backdrop-blur-2xl`           | Efecto vidrio esmerilado de alta dispersión        |
| **Borde Perimetral**    | `border border-white/10`      | Definición de límites y reflejo de luz             |
| **Radio de Borde**      | `rounded-2xl` / `rounded-3xl` | Esquinas redondeadas modernas para cards y modales |

### 2.2 Cuadrantes Temáticos ("As 4 Chaves do Tabuleiro")

El diseño de Figma organiza la progresión del hackathon en 4 grandes pilares. Cada uno recibió un token de color neón con resplandor (_glow shadow_) en estados activos y hover:

```
┌─────────────────────────────────┬─────────────────────────────────┐
│          1. PROBLEMA            │           2. SOLUÇÃO            │
│       Ámbar (#F9CA4A)           │         Lima (#B7FF5A)          │
│   hover:shadow-glow-amber       │     hover:shadow-glow-lime      │
├─────────────────────────────────┼─────────────────────────────────┤
│          3. ALIANÇAS            │        4. OPORTUNIDADES         │
│        Morado (#9B8CFF)         │         Cyan (#50DDFF)          │
│   hover:shadow-glow-purple      │     hover:shadow-glow-cyan      │
└─────────────────────────────────┴─────────────────────────────────┘
```

- **Problema (Fase 01 • Explorar):** `#F9CA4A` (`border-[#F9CA4A]/30`, `bg-[#F9CA4A]/10`)
- **Solução (Fase 02 • Construir):** `#B7FF5A` (`border-[#B7FF5A]/30`, `bg-[#B7FF5A]/10`)
- **Alianças / Parcerias (Fase 03 • Conectar):** `#9B8CFF` (`border-[#9B8CFF]/30`, `bg-[#9B8CFF]/10`)
- **Oportunidades (Fase 04 • Escalar):** `#50DDFF` (`border-[#50DDFF]/30`, `bg-[#50DDFF]/10`)

### 2.3 Botones y Estados de Acción

- **Acción Positiva / Iniciar / Avanzar:**
  ```css
  bg-gradient-to-r from-[#B7FF5A] to-[#0FD4B0] text-black font-extrabold uppercase border-none shadow-[0_0_20px_-5px_rgba(183,255,90,0.4)]
  ```
- **Acción Crítica / Detener / Pausar:**
  ```css
  bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-bold shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]
  ```

---

## 3. Mapeo de Pantallas y Componentes

La homologación visual se implementó de forma consistente en las tres rutas clave de la aplicación:

### 3.1 Portal de Acceso y Bienvenida (`/es`)

- **Archivo:** `apps/web/src/features/auth/LoginScreen.tsx`
- **Implementación:**
  - Fondo `min-h-screen bg-[#08090D] text-white`.
  - Panel dividido: Héroe con estrellas de agua y selector de pestañas (`login-tabs`) dentro de cápsula `bg-[#14161C]/80 backdrop-blur-2xl`.
  - Botones de envío (_Entrar_, _Criar conta_, _Entrar no jogo_) migrados al gradiente neón.
  - Acordeones de conceptos (`HeroConceitos.tsx`) estilizados con bordes translúcidos y microinteracciones de elevación.

### 3.2 Cuartel de Control del Educador (`/es/mestre/dashboard`)

- **Archivo:** `apps/web/src/features/event/EducadorPanel.tsx`
- **Implementación:**
  - Barra superior (_topbar_) y barra lateral de sesiones en Dark Glass.
  - Tarjetas métricas (Equipos activos, participantes, código de acceso) con bordes iluminados por llave.
  - Matriz de equipos en tiempo real (`eq-card`) con microindicadores de progreso por colores.
  - Botones de inicio y detención del temporizador de sesión integrados con las variantes neón y roja traslúcida.

### 3.3 Tablero Interactivo del Participante (`/es/jogador/dashboard`)

- **Archivo:** `apps/web/src/features/event/PlayerBoard.tsx`
- **Implementación:**
  - Franja superior de puntaje y XP del equipo con badges de gema dorada (`#F0BC40`).
  - Tarjetas de los 4 Pilares con estados dinámicos (Bloqueada, En progreso con borde neón, Concluida con check verde).
  - Panel de chat colaborativo ("Balões") y susurros privados integrados en contenedores Dark Glass.
  - Modales hijos estandarizados ([`Modal.tsx`](file:///apps/web/src/components/ui/Modal.tsx), [`SubmissionModal.tsx`](file:///apps/web/src/features/event/SubmissionModal.tsx), [`RolePickerModal.tsx`](file:///apps/web/src/features/event/RolePickerModal.tsx)).

---

## 4. Guía para Extender Nuevos Diseños

Cuando se importen nuevos wireframes o frames de Figma a este proyecto, seguir estas reglas:

1. **Jerarquía de Fondos:** Nunca usar fondos blancos ni grises opacos `#1F2937`. Usar siempre `--bg: #08090D` para lienzos y `rgba(20, 22, 28, 0.82)` para tarjetas.
2. **Iconografía (Lucide React):** Para enlaces a repositorios de código, usar el icono **`GitBranch`** en lugar de `Github`, ya que `lucide-react` no incluye marcas comerciales en su export raíz.
3. **Contraste de Tipografía:**
   - Títulos, números y contadores: `text-white font-extrabold font-[family-name:var(--font-manrope)]`.
   - Textos secundarios o labels: `text-white/60` o `text-white/40`.
4. **Verificación de Tipos:** Ejecutar siempre tras un reskin:
   ```bash
   pnpm --filter web typecheck
   ```
