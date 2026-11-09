import type { Metadata } from "next";
import { MeView } from "./me-view";

export const metadata: Metadata = { title: "Me · Dinnr" };

export default function MePage() {
  return (
    <>
      <h1 className="sr-only">Me</h1>
      <MeView />
    </>
  );
}
