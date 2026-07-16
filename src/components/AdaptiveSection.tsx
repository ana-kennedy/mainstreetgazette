// Phase 01 (Gazette experience redesign) — Constitution rule 4: "Never expose an
// empty promise. Hide adaptive sections until enough useful content exists."
//
// Phase 06 extends this with an optional diversity check: a raw item count can be
// satisfied by, say, five items from a single source, which isn't "meaningful
// variety" (see temp/05_TECHNICAL_ARCHITECTURE/CONTENT_AND_STORAGE_MODEL.md's warning
// against simplistic count-only thresholds). Passing sourceIDs + minUniqueSources adds
// that check on top of the existing itemCount/minItems gate; omitting them keeps the
// original count-only behavior for callers that don't have per-item source data handy.
import React from "react";

interface AdaptiveSectionProps {
  itemCount: number;
  minItems?: number;
  sourceIDs?: string[];
  minUniqueSources?: number;
  children: React.ReactNode;
}

export function AdaptiveSection({ itemCount, minItems = 1, sourceIDs, minUniqueSources, children }: AdaptiveSectionProps) {
  if (itemCount < minItems) return null;
  if (minUniqueSources !== undefined) {
    const uniqueSourceCount = new Set(sourceIDs ?? []).size;
    if (uniqueSourceCount < minUniqueSources) return null;
  }
  return <>{children}</>;
}
