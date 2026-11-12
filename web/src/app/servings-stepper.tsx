import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVINGS_STEP } from "@/lib/meal-log";

/** "½", "1", "1½", "2": servings in ½ steps as a mixed number. */
export function servingsAmount(servings: number): string {
  const whole = Math.floor(servings);
  const half = servings - whole >= SERVINGS_STEP ? "½" : "";
  return whole === 0 ? half || "0" : `${whole}${half}`;
}

/** "½ serving", "1 serving", "1½ servings". */
export function servingsText(servings: number): string {
  return `${servingsAmount(servings)} ${servings > 1 ? "servings" : "serving"}`;
}

/**
 * A − / + stepper for servings in ½ steps, at least ½. The amount is announced as it changes. `label` names what's being
 * counted for assistive tech when there are several on screen.
 */
export function ServingsStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange?: (servings: number) => void;
  /** e.g. "Grilled Chicken Breast": the buttons read "Fewer servings of …". */
  label?: string;
}) {
  const of = label ? ` of ${label}` : "";
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-tap"
        aria-label={`Fewer servings${of}`}
        disabled={value <= SERVINGS_STEP}
        onClick={onChange && (() => onChange(value - SERVINGS_STEP))}
      >
        <Minus aria-hidden />
      </Button>
      <output aria-live="polite" className="min-w-24 text-center text-sm tabular-nums">
        {servingsText(value)}
      </output>
      <Button
        type="button"
        variant="outline"
        size="icon-tap"
        aria-label={`More servings${of}`}
        onClick={onChange && (() => onChange(value + SERVINGS_STEP))}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
