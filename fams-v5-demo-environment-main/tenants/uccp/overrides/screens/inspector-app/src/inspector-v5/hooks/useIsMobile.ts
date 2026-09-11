import { useEffect, useState } from "react";

/**
 * useIsMobile — single source of truth for the app-level mobile/tablet
 * breakpoint. Locked rule (UX review 2026-08-18):
 *
 *   mobile shell = (pointer: coarse) AND (width <= 900 OR (portrait AND width <= 1024))
 *                  OR width <= 767
 *
 * i.e. any touch device up to a portrait 1024px-wide tablet counts as
 * "mobile" (gets the stacked/full-screen shells), but a LANDSCAPE coarse
 * tablet at >=1024px wide (e.g. iPad landscape) intentionally keeps the
 * desktop-style layout — that surface is made touch-safe via other B-series
 * fixes (44px targets, panel exclusivity) instead of switching shells.
 * Plain narrow desktop/laptop windows (fine pointer) only flip to mobile via
 * the width<=767 clause, unchanged from before.
 *
 * Shared between App.tsx (to gate the app-level chrome — Sidebar/TopNavbar —
 * off for the mobile Inspector shell) and the Inspector Field App itself
 * (src/app/components/inspector/useIsMobile.ts re-exports this). Desktop and
 * landscape-tablet layouts must render EXACTLY as they do today outside this
 * rule — this hook is the single gate for both.
 */
function computeIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  const narrowQuery = window.matchMedia("(max-width: 767px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow900 = window.matchMedia("(max-width: 900px)").matches;
  const portrait1024 = window.matchMedia("(orientation: portrait) and (max-width: 1024px)").matches;
  return narrowQuery || (coarse && (narrow900 || portrait1024));
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(computeIsMobile);

  useEffect(() => {
    const queries = [
      window.matchMedia("(max-width: 767px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(max-width: 900px)"),
      window.matchMedia("(orientation: portrait) and (max-width: 1024px)"),
    ];
    const update = () => setIsMobile(computeIsMobile());
    update();
    queries.forEach((mq) => mq.addEventListener("change", update));
    return () => {
      queries.forEach((mq) => mq.removeEventListener("change", update));
    };
  }, []);

  return isMobile;
}
