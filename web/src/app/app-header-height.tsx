"use client";

import { useLayoutEffect } from "react";

/** The CSS variable behind the `app-header` spacing token (`top-app-header`, `scroll-mt-app-header`). */
const HEADER_HEIGHT_VARIABLE = "--spacing-app-header";

/**
 * Keeps the `app-header` spacing token equal to the sticky app header's real
 * height, which grows while the allergen banner shows (and when it wraps on a
 * phone). Pinned station headers sit just below the app header, and station
 * deep links scroll their station there, using this token. `globals.css`
 * holds the banner-less default for the first paint.
 */
export function AppHeaderHeight({ selector }: { selector: string }) {
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(selector);
    if (!header) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(HEADER_HEIGHT_VARIABLE, `${header.getBoundingClientRect().height}px`);
    });
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty(HEADER_HEIGHT_VARIABLE);
    };
  }, [selector]);

  return null;
}
