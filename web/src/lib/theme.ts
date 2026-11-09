import { PREFERENCES_STORAGE_KEY, PREFERENCES_VERSION, type Theme } from "./preferences";

/**
 * Applying the Appearance choice (`Preferences.theme`) to the page. The
 * stylesheet's dark tokens hang off `data-theme="dark"` on `<html>`; this
 * module decides that value. Pure and isomorphic: the root layout inlines
 * `THEME_SCRIPT`, and `ThemeSync` uses the same rules after hydration.
 */

export type ResolvedTheme = "light" | "dark";

export const THEME_ATTRIBUTE = "data-theme";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/** System follows the phone's light/dark setting; Light and Dark force one. */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}

/**
 * Runs in `<head>` before the page is drawn, so it never shows the wrong
 * colors. It mirrors `parsePreferences` for this one field: anything it can't
 * read (no data, bad JSON, another version, an unknown theme, blocked
 * storage) counts as System.
 */
export const THEME_SCRIPT = `(function () {
  var theme = "system";
  try {
    var stored = JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES_STORAGE_KEY)}));
    var version = stored && typeof stored.version === "number" ? stored.version : ${PREFERENCES_VERSION};
    if (stored && version === ${PREFERENCES_VERSION} && (stored.theme === "light" || stored.theme === "dark")) {
      theme = stored.theme;
    }
  } catch (e) {}
  if (theme === "system") theme = matchMedia(${JSON.stringify(DARK_SCHEME_QUERY)}).matches ? "dark" : "light";
  document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, theme);
})();`;
