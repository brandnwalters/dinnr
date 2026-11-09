"use client";

import { XIcon } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { MenuItem } from "@/lib/today";
import { loadNutritionDetail } from "./nutrition-actions";
import { NutritionSheetContents, type NutritionLoad } from "./nutrition-sheet-contents";

/**
 * A dish's name as a button that opens its nutrition: a bottom sheet below
 * tablet width, a centered dialog from tablet width up. Nutrition is fetched
 * on first open (and again only if that failed). Radix's dialog traps focus,
 * closes on Escape and returns focus to the dish's name.
 */
export function NutritionSheet({
  item,
  onToggleFavorite,
}: {
  item: MenuItem;
  onToggleFavorite?: (item: MenuItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionLoad | null>(null);

  // A page hidden by navigation keeps its state; close the sheet so it isn't
  // still open when the student comes back to this tab.
  useLayoutEffect(() => () => setOpen(false), []);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next || nutrition?.state === "loaded" || nutrition?.state === "loading") return;
    setNutrition({ state: "loading" });
    loadNutritionDetail(item.recipeId).then(
      (detail) => setNutrition({ state: "loaded", detail }),
      () => setNutrition({ state: "error" }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger className="cursor-pointer text-left underline decoration-dotted underline-offset-4">
        {item.name}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-auto bottom-0 max-h-sheet max-w-full translate-y-0 sm:max-w-full overflow-y-auto rounded-b-none md:top-1/2 md:bottom-auto md:max-w-md md:-translate-y-1/2 md:rounded-xl"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4">
          <DialogTitle className="pt-3 text-lg">{item.name}</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-tap" aria-label="Close">
              <XIcon aria-hidden />
            </Button>
          </DialogClose>
        </DialogHeader>
        <NutritionSheetContents
          item={item}
          nutrition={nutrition ?? { state: "loading" }}
          onToggleFavorite={onToggleFavorite}
        />
      </DialogContent>
    </Dialog>
  );
}
