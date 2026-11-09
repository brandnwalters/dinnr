"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "./app-nav";

/** The app navigation for the current URL (`usePathname` needs a client component). */
export function CurrentAppNav() {
  return <AppNav pathname={usePathname()} />;
}
