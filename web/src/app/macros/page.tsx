import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuSkeleton } from "../menu-skeleton";
import { MacrosView } from "./macros-view";

export const metadata: Metadata = { title: "Macros · Dinnr" };

export default function MacrosPage() {
  return (
    <>
      <h1 className="sr-only">Macros</h1>
      {/* Suspense: MacrosView reads `?meal=` and `?hall=` from the URL. */}
      <Suspense fallback={<MenuSkeleton />}>
        <MacrosView />
      </Suspense>
    </>
  );
}
