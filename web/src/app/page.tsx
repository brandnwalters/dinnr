import { connection } from "next/server";
import { Suspense } from "react";
import { getToday } from "@/lib/today";
import { HallMenu } from "./hall-menu";
import styles from "./page.module.css";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className={styles.main}>
      <h1>Dinnr</h1>
      <Suspense fallback={<p>Loading today&apos;s menus…</p>}>
        <TodayMenus searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TodayMenus({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // menus change during the day: read the DB per request
  const { meal } = await searchParams; // ?meal=Dinner switches every hall that serves it today
  const today = await getToday({ now: new Date(), mealPeriod: typeof meal === "string" ? meal : undefined });
  // One column per hall on desktop, stacked on narrow screens (page.module.css).
  return (
    <div className={styles.halls}>
      {today.halls.map((hall) => (
        <HallMenu key={hall.slug} hall={hall} />
      ))}
    </div>
  );
}
