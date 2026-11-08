"use client";

import { useId, useRef, useState } from "react";
import type { NutritionDetail } from "@/lib/nutrition-detail";
import { loadNutritionDetail } from "./nutrition-actions";
import { NutritionLabel } from "./nutrition-label";
import styles from "./nutrition-panel.module.css";

type Loaded = { state: "loading" } | { state: "loaded"; detail: NutritionDetail | null } | { state: "error" };

/**
 * A menu item's name as a button. Tapping it opens a panel (a bottom sheet on
 * phones) with the item's full nutrition label and ingredients, fetched on
 * first open. The panel is a modal <dialog>, so Escape closes it and focus
 * returns to the button.
 */
export function NutritionButton({ recipeId, name }: { recipeId: number; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  function open() {
    dialog.current?.showModal();
    if (loaded?.state === "loaded") return;
    setLoaded({ state: "loading" });
    loadNutritionDetail(recipeId).then(
      (detail) => setLoaded({ state: "loaded", detail }),
      () => setLoaded({ state: "error" }),
    );
  }

  return (
    <>
      <button type="button" className={styles.trigger} aria-haspopup="dialog" onClick={open}>
        {name}
      </button>
      <dialog
        ref={dialog}
        className={styles.panel}
        aria-labelledby={titleId}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
      >
        <div className={styles.header}>
          <h3 id={titleId}>{name}</h3>
          <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
        {loaded?.state === "loading" && <p>Loading nutrition…</p>}
        {loaded?.state === "error" && <p>Couldn&apos;t load nutrition. Try again later.</p>}
        {loaded?.state === "loaded" && <NutritionLabel detail={loaded.detail} />}
      </dialog>
    </>
  );
}
