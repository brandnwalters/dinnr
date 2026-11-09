import { Suspense } from "react";
import { MenuSkeleton } from "./menu-skeleton";
import { TodayView } from "./today-view";

export default function Home() {
  return (
    <>
      <h1 className="sr-only">Today</h1>
      {/* Menus depend on on-device preferences, so they load in the browser.
          Suspense: TodayView reads `?meal=` from the URL. */}
      <Suspense fallback={<MenuSkeleton />}>
        <TodayView />
      </Suspense>
    </>
  );
}
