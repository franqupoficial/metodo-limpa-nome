"use client";
import { useEffect } from "react";
import { track } from "./Consent";
export function TrackSearch({ q }: { q: string }) {
  useEffect(() => track("search", { search_term: q }), [q]);
  return null;
}
