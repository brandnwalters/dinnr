import { TodayView } from "./today-view";

export default function Home() {
  return (
    <main>
      <h1>Dinnr</h1>
      {/* Menus depend on on-device preferences, so they load in the browser. */}
      <TodayView />
    </main>
  );
}
