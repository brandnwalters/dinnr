"use client";

import { useLayoutEffect } from "react";
import { usePreferences } from "@/lib/preferences-store";
import { DARK_SCHEME_QUERY, resolveTheme, THEME_ATTRIBUTE } from "@/lib/theme";

/**
 * Keeps `<html data-theme>` in step with the Appearance choice after the page
 * has loaded (the inline `THEME_SCRIPT` sets it before the first paint):
 * switches immediately when the choice changes, follows the phone while
 * System is chosen, and re-applies it if React resets `<html>` (dev Strict Mode).
 */
export function ThemeSync() {
  const [preferences] = usePreferences();
  const theme = preferences?.theme;

  useLayoutEffect(() => {
    if (!theme) return;
    const media = window.matchMedia(DARK_SCHEME_QUERY);
    const apply = () => document.documentElement.setAttribute(THEME_ATTRIBUTE, resolveTheme(theme, media.matches));
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return null;
}
