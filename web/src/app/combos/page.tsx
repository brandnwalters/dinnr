import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuSkeleton } from "../menu-skeleton";
import { CombosView } from "./combos-view";

export const metadata: Metadata = { title: "Combos · Dinnr" };

export default function CombosPage() {
  return (
    <>
      <h1 className="sr-only">Combos</h1>
      {/* Suspense: CombosView reads `?meal=` and `?hall=` from the URL. */}
      <Suspense fallback={<MenuSkeleton />}>
        <CombosView />
      </Suspense>
    </>
  );
}
