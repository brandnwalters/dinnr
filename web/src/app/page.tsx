import { Suspense } from "react";
import styles from "./page.module.css";
import { TodayView } from "./today-view";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Dinnr</h1>
      {/* Menus depend on on-device preferences, so they load in the browser.
          Suspense: TodayView reads `?meal=` from the URL. */}
      <Suspense fallback={<p>Loading today&apos;s menus…</p>}>
        <TodayView />
      </Suspense>
    </main>
  );
}
