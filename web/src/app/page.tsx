import { connection } from "next/server";
import { Suspense } from "react";
import { getToday } from "@/lib/today";
import { HallMenu } from "./hall-menu";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Dinnr</h1>
      <Suspense fallback={<p>Loading today&apos;s menus…</p>}>
        <TodayMenus />
      </Suspense>
    </main>
  );
}

async function TodayMenus() {
  await connection(); // menus change during the day: read the DB per request
  const today = await getToday({ now: new Date() });
  // One column per hall on desktop, stacked on narrow screens (page.module.css).
  return (
    <div className={styles.halls}>
      {today.halls.map((hall) => (
        <HallMenu key={hall.slug} hall={hall} />
      ))}
    </div>
  );
}
