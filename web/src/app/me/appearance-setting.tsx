import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isTheme, THEMES, type Theme } from "@/lib/preferences";

const THEME_LABELS: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

/**
 * The Appearance setting: a segmented System / Light / Dark control. It is a
 * single-choice radio group, so assistive tech announces which is selected.
 */
export function AppearanceSetting({ theme, onChange }: { theme: Theme; onChange?: (theme: Theme) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      aria-label="Appearance"
      value={theme}
      // Radix reports "" when the selected item is pressed again: keep the current choice.
      onValueChange={(value) => isTheme(value) && onChange?.(value)}
    >
      {THEMES.map((t) => (
        <ToggleGroupItem key={t} value={t} className="min-h-tap px-4">
          {THEME_LABELS[t]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
