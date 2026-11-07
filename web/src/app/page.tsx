import { connection } from "next/server";
import { Suspense } from "react";
import { getToday } from "@/lib/today";
import { HallMenu } from "./hall-menu";

export default function Home() {
  return (
    <main>
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
  return (
    <>
      {today.halls.map((hall) => (
        <HallMenu key={hall.slug} hall={hall} />
      ))}
    </>
  );
}
