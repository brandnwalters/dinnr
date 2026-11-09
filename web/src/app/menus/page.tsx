import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuSkeleton } from "../menu-skeleton";
import { MenusView } from "./menus-view";

export const metadata: Metadata = { title: "Menus · Dinnr" };

export default function MenusPage() {
  return (
    <>
      <h1 className="sr-only">Menus</h1>
      {/* Suspense: MenusView reads `?meal=` and `?hall=` from the URL. */}
      <Suspense fallback={<MenuSkeleton />}>
        <MenusView />
      </Suspense>
    </>
  );
}
