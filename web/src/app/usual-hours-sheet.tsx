"use client";

import { XIcon } from "lucide-react";
import { createContext, use, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clock } from "@/lib/hall-status";
import type { Hall } from "@/lib/today";
import type { UsualHours, UsualMealPeriod } from "@/lib/usual-hours";
import { cn } from "@/lib/utils";

type UsualHoursControl = { hallName: string; open: boolean; show: (opener: HTMLElement) => void };
const UsualHoursContext = createContext<UsualHoursControl | null>(null);

/**
 * A hall's Usual hours sheet: a bottom sheet below tablet width, a centered
 * dialog from tablet width up. Any `UsualHoursButton` inside `children` opens
 * it. Radix's dialog traps focus and closes on Escape; focus goes back to the
 * button that opened it (there can be several, so it's tracked here).
 */
export function UsualHoursSheet({ hall, children }: { hall: Hall; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const noteId = useId();

  // A page hidden by navigation keeps its state; close the sheet so it isn't
  // still open when the student comes back to this tab.
  useLayoutEffect(() => () => setOpen(false), []);

  const show = (button: HTMLElement) => {
    opener.current = button;
    setOpen(true);
  };

  return (
    <UsualHoursContext value={{ hallName: hall.name, open, show }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={noteId}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="top-auto bottom-0 max-h-sheet max-w-full translate-y-0 sm:max-w-full overflow-y-auto rounded-b-none md:top-1/2 md:bottom-auto md:max-w-md md:-translate-y-1/2 md:rounded-xl"
        >
          <DialogHeader className="flex-row items-start justify-between gap-4">
            <DialogTitle className="pt-3 text-lg">Usual hours · {hall.name}</DialogTitle>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon-tap" aria-label="Close">
                <XIcon aria-hidden />
              </Button>
            </DialogClose>
          </DialogHeader>
          <UsualHoursContents usualHours={hall.usualHours} noteId={noteId} />
        </DialogContent>
      </Dialog>
    </UsualHoursContext>
  );
}

/**
 * A button (at least a tap target tall) that opens the enclosing
 * `UsualHoursSheet`. `children` is its visible label; screen readers also
 * hear "Usual hours for <hall>".
 */
export function UsualHoursButton({ children, className }: { children: ReactNode; className?: string }) {
  const control = use(UsualHoursContext);
  if (!control) throw new Error("UsualHoursButton must be inside a UsualHoursSheet");
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={control.open}
      onClick={(event) => control.show(event.currentTarget)}
      className={cn(
        "flex min-h-tap w-fit cursor-pointer items-center rounded-md text-left underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
      <span className="sr-only"> · Usual hours for {control.hallName}</span>
    </button>
  );
}

/** "Lunch 11am–2:30pm", or just "Lunch" without readable hours. */
function UsualMealPeriodLine({ mealPeriod }: { mealPeriod: UsualMealPeriod }) {
  const { name, start, end } = mealPeriod;
  return (
    <li className="flex justify-between gap-3">
      <span>{name}</span>
      {start && end && (
        <span className="text-muted-foreground tabular-nums">
          {clock(start)}–{clock(end)}
        </span>
      )}
    </li>
  );
}

/**
 * The sheet's body: the note that these are inferred, then one row per
 * weekday, Monday to Sunday, with that weekday's meal periods and hours,
 * "Closed", or "–" when no day on it has been saved.
 */
export function UsualHoursContents({ usualHours, noteId }: { usualHours: UsualHours; noteId?: string }) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      <p id={noteId} className="text-sm text-muted-foreground">
        Usual hours based on recent weeks, not an official schedule. Check UNC Dining around breaks and
        holidays. – means no saved day yet.
      </p>
      <dl className="flex flex-col">
        {usualHours.map((day) => (
          <div key={day.weekday} className="flex gap-4 border-b border-border/60 py-2 text-sm last:border-b-0">
            <dt className="w-24 shrink-0 font-medium">{day.weekday}</dt>
            <dd className="flex-1">
              {day.status === "open" ? (
                <ul className="flex flex-col gap-0.5">
                  {day.mealPeriods.map((mealPeriod) => (
                    <UsualMealPeriodLine key={mealPeriod.name} mealPeriod={mealPeriod} />
                  ))}
                </ul>
              ) : day.status === "closed" ? (
                <span className="text-muted-foreground">Closed</span>
              ) : (
                <span className="text-muted-foreground">–</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
