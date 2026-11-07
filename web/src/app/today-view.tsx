"use client";

import { useEffect, useState } from "react";
import { usePreferences } from "@/lib/preferences-store";
import type { TodayMenu } from "@/lib/today";
import { loadToday } from "./actions";
import { DietFilters } from "./diet-filters";
import { HallMenu } from "./hall-menu";
import styles from "./page.module.css";

/**
 * The home page body. Preferences live on the device, so the menus are loaded
 * from the browser (through `loadToday`) once they've been read, and again
 * whenever they change. Nothing is shown before then, so filtered-out items
 * never flash on screen.
 */
export function TodayView() {
  const [preferences, updatePreferences] = usePreferences();
  const [today, setToday] = useState<TodayMenu | null>(null);

  useEffect(() => {
    if (!preferences) return;
    let current = true;
    loadToday(preferences).then((menu) => {
      if (current) setToday(menu);
    });
    return () => {
      current = false;
    };
  }, [preferences]);

  if (!preferences) return <p>Loading today&apos;s menus…</p>;
  return (
    <>
      <DietFilters
        selected={preferences.dietFilters}
        onChange={(dietFilters) => updatePreferences((p) => ({ ...p, dietFilters }))}
      />
      {today === null ? (
        <p>Loading today&apos;s menus…</p>
      ) : (
        // One column per hall on desktop, stacked on narrow screens (page.module.css).
        <div className={styles.halls}>
          {today.halls.map((hall) => (
            <HallMenu key={hall.slug} hall={hall} />
          ))}
        </div>
      )}
    </>
  );
}
