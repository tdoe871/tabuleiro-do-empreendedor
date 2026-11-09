"use client";

import { useEffect } from "react";

export const ANTIGRAVITY_THEME_TOKENS = [
  "colorBackground",
  "colorSidebar",
  "colorSurface",
  "colorSurfaceSolid",
  "colorSurfaceInteractive",
  "colorSurfaceHover",
  "colorSurfaceSelected",
  "colorSurfaceFeatured",
  "colorText",
  "colorTextMuted",
  "colorBorder",
  "colorAccent",
  "colorOnAccent",
  "colorSuccess",
  "colorInfo",
  "colorSecondary",
  "colorWarning",
  "colorDisabled",
  "colorGradientStart",
  "colorGradientMiddle",
  "colorGradientEnd",
  "colorFocusRing",
  "colorSelectionGlow",
  "colorShadow",
  "colorAvatarStrategist",
  "colorAvatarResearcher",
  "colorAvatarBuilder",
  "colorAvatarConnector",
  "radiusControl",
  "radiusCard",
  "radiusPill",
] as const;

export type AntigravityTokenKey = (typeof ANTIGRAVITY_THEME_TOKENS)[number];
export type AntigravityThemeMap = Record<AntigravityTokenKey, string>;

export const TURQUOISE_MODERN_THEME: AntigravityThemeMap = {
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

  colorGradientStart: "rgba(0, 245, 212, 0.16)",
  colorGradientMiddle: "rgba(6, 182, 212, 0.10)",
  colorGradientEnd: "rgba(4, 21, 31, 0.98)",
  colorFocusRing: "rgba(0, 245, 212, 0.35)",
  colorSelectionGlow: "rgba(0, 245, 212, 0.32)",
  colorShadow: "rgba(0, 245, 212, 0.20)",

  colorAvatarStrategist: "#00f5d4",
  colorAvatarResearcher: "#00bbf9",
  colorAvatarBuilder: "#2dd4bf",
  colorAvatarConnector: "#38bdf8",

  radiusControl: "12px",
  radiusCard: "20px",
  radiusPill: "999px",
};

export const ORIGINAL_DARK_THEME: AntigravityThemeMap = {
  colorBackground: "#08090D",
  colorSidebar: "#0D0E14",
  colorSurface: "rgba(20, 22, 28, 0.85)",
  colorSurfaceSolid: "#14161C",
  colorSurfaceInteractive: "#1A1D26",
  colorSurfaceHover: "rgba(183, 255, 90, 0.08)",
  colorSurfaceSelected: "rgba(183, 255, 90, 0.14)",
  colorSurfaceFeatured: "#181B24",

  colorText: "#F2F4F8",
  colorTextMuted: "#959BA8",
  colorBorder: "rgba(255, 255, 255, 0.10)",

  colorAccent: "#B7FF5A",
  colorOnAccent: "#08090D",
  colorSuccess: "#22C97A",
  colorInfo: "#50DDFF",
  colorSecondary: "#9B8CFF",
  colorWarning: "#F9CA4A",
  colorDisabled: "#555B6E",

  colorGradientStart: "rgba(20, 22, 28, 0.96)",
  colorGradientMiddle: "rgba(13, 14, 20, 0.92)",
  colorGradientEnd: "rgba(8, 9, 13, 1)",
  colorFocusRing: "rgba(183, 255, 90, 0.25)",
  colorSelectionGlow: "rgba(183, 255, 90, 0.20)",
  colorShadow: "rgba(0, 0, 0, 0.65)",

  colorAvatarStrategist: "#9B8CFF",
  colorAvatarResearcher: "#50DDFF",
  colorAvatarBuilder: "#F9CA4A",
  colorAvatarConnector: "#22C97A",

  radiusControl: "12px",
  radiusCard: "20px",
  radiusPill: "999px",
};

export interface AntigravityThemeContract {
  schema: {
    tokens: readonly AntigravityTokenKey[];
  };
  getTheme: () => AntigravityThemeMap;
  applyTheme: (tokens: Partial<AntigravityThemeMap>) => AntigravityThemeMap;
  resetTheme: () => AntigravityThemeMap;
}

declare global {
  interface Window {
    antigravityTheme?: AntigravityThemeContract;
  }
}

function tokenToCssVar(key: AntigravityTokenKey): string {
  return `--ag-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

function syncThemeToCssVariables(theme: AntigravityThemeMap) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const key of ANTIGRAVITY_THEME_TOKENS) {
    root.style.setProperty(tokenToCssVar(key), theme[key]);
  }

  // Sync legacy/core application CSS variables so all components respond to applyTheme()
  root.style.setProperty("--bg", theme.colorBackground);
  root.style.setProperty("--bg2", theme.colorSidebar);
  root.style.setProperty("--bg3", theme.colorSurfaceSolid);
  root.style.setProperty("--card", theme.colorSurface);
  root.style.setProperty("--card2", theme.colorSurfaceFeatured);
  root.style.setProperty("--border", theme.colorBorder);
  root.style.setProperty("--border2", theme.colorBorder);
  root.style.setProperty("--t1", theme.colorText);
  root.style.setProperty("--t2", theme.colorText);
  root.style.setProperty("--t3", theme.colorTextMuted);

  root.style.setProperty("--prob", theme.colorSuccess);
  root.style.setProperty("--sol", theme.colorAccent);
  root.style.setProperty("--parc", theme.colorSecondary);
  root.style.setProperty("--opor", theme.colorInfo);
  root.style.setProperty("--gold", theme.colorWarning);

  root.style.setProperty("--neon-bg", theme.colorBackground);
  root.style.setProperty("--panel", theme.colorSurface);
  root.style.setProperty("--line", theme.colorBorder);
  root.style.setProperty("--muted", theme.colorTextMuted);
  root.style.setProperty("--lime", theme.colorAccent);
  root.style.setProperty("--purple", theme.colorSecondary);
  root.style.setProperty("--cyan", theme.colorInfo);
}

export function AntigravityThemeBridge() {
  useEffect(() => {
    const validSet = new Set<string>(ANTIGRAVITY_THEME_TOKENS);
    let currentTheme: AntigravityThemeMap = { ...TURQUOISE_MODERN_THEME };

    const bridge: AntigravityThemeContract = {
      schema: {
        tokens: ANTIGRAVITY_THEME_TOKENS,
      },
      getTheme() {
        return { ...currentTheme };
      },
      applyTheme(partialTokens: Partial<AntigravityThemeMap>) {
        if (partialTokens && typeof partialTokens === "object") {
          const next = { ...currentTheme };
          for (const [k, v] of Object.entries(partialTokens)) {
            if (validSet.has(k) && typeof v === "string" && v.trim() !== "") {
              next[k as AntigravityTokenKey] = v.trim();
            }
          }
          currentTheme = next;
          syncThemeToCssVariables(currentTheme);
          window.dispatchEvent(
            new CustomEvent("antigravity:theme-changed", {
              detail: { ...currentTheme },
            }),
          );
        }
        return { ...currentTheme };
      },
      resetTheme() {
        currentTheme = { ...ORIGINAL_DARK_THEME };
        syncThemeToCssVariables(currentTheme);
        window.dispatchEvent(
          new CustomEvent("antigravity:theme-changed", {
            detail: { ...currentTheme },
          }),
        );
        return { ...currentTheme };
      },
    };

    window.antigravityTheme = bridge;
    window.dispatchEvent(
      new CustomEvent("antigravity:theme-ready", { detail: bridge }),
    );

    const applyReskin = () => {
      const activeBridge = window.antigravityTheme;

      if (!activeBridge) {
        window.addEventListener("antigravity:theme-ready", applyReskin, {
          once: true,
        });
        return;
      }

      activeBridge.applyTheme(TURQUOISE_MODERN_THEME);
    };

    applyReskin();
  }, []);

  return null;
}
