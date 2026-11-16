/**
 * Modern unix TUI theme.
 *
 * Two palettes: `night` (default) and `day`. Color names follow their role
 * in the interface, not the hue, so switching palettes never touches the
 * screens. Rounded borders, dimmed labels and strong values build the visual
 * hierarchy. The choice comes from `tui.theme` in settings.json.
 *
 * Accent, active border and key colors come from the Pagespeedfy brand
 * tokens in `brand/tokens.json` (primary teal and accent green); the rest
 * keeps the Termfy base palette. `ok`, `warn` and `error` double as the
 * Lighthouse score bands in the History screen.
 */
import { readSettings, getPath } from "../config/settings.ts";

export interface Theme {
  name: string;
  background: string;
  surface: string;
  surfaceHigh: string;
  border: string;
  borderActive: string;
  text: string;
  textDim: string;
  textStrong: string;
  accent: string;
  accentSecondary: string;
  ok: string;
  warn: string;
  error: string;
  barBackground: string;
  barText: string;
  keyBackground: string;
  keyText: string;
}

export const themes: Record<"night" | "day", Theme> = {
  night: {
    name: "night",
    background: "#1a1b26",
    surface: "#1f2335",
    surfaceHigh: "#24283b",
    border: "#3b4261",
    borderActive: "#2AD5BE",
    text: "#c0caf5",
    textDim: "#565f89",
    textStrong: "#e0e6ff",
    accent: "#2AD5BE",
    accentSecondary: "#4ADE80",
    ok: "#9ece6a",
    warn: "#e0af68",
    error: "#f7768e",
    barBackground: "#16161e",
    barText: "#a9b1d6",
    keyBackground: "#15626A",
    keyText: "#ffffff",
  },
  day: {
    name: "day",
    background: "#e1e2e7",
    surface: "#d6d8df",
    surfaceHigh: "#c4c8da",
    border: "#a8aecb",
    borderActive: "#1C8986",
    text: "#3760bf",
    textDim: "#848cb5",
    textStrong: "#1b2a5e",
    accent: "#1C8986",
    accentSecondary: "#15803D",
    ok: "#587539",
    warn: "#8c6c3e",
    error: "#f52a65",
    barBackground: "#c4c8da",
    barText: "#3760bf",
    keyBackground: "#1C8986",
    keyText: "#ffffff",
  },
};

/** Reads `tui.theme` and returns the palette. Any failure falls back to `night`. */
export function currentTheme(): Theme {
  try {
    const name = getPath(readSettings(), "tui.theme");
    if (name === "day") return themes.day;
  } catch {
    // Without readable settings, keep the default palette.
  }
  return themes.night;
}

/** Glyphs used by the screens; all fit in one cell. */
export const glyphs = {
  bullet: "•",
  arrow: "→",
  ok: "✓",
  warn: "!",
  error: "✗",
  separator: "│",
  block: "▌",
};
