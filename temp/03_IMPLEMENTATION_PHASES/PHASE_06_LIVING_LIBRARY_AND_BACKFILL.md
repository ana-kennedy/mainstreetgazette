# Phase 06 — Living Gazette Library and Adaptive Backfill

## Goal
Grow useful metadata without allowing storage to balloon.

## Storage tiers
- User-owned: saves, collections, trip data, progress. Preserve until user deletes.
- Fresh content: metadata, clean text where available, and recently needed images.
- Remembered content: metadata, summary, tags, relationships, original URL; remove bulky body/images when appropriate.
- Archived metadata: minimum searchable record.

## Backfill
- Articles: ingest available feed history; use future Booster Packs for missing history.
- Podcasts and YouTube: perform resumable metadata backfill in adaptive batches.
- Social: per-platform capability and terms.
- Initial essential-source target: about 150–200 metadata records.
- Later foreground batches: roughly 100–250.
- Favorable background batches: up to roughly 500 within time/device constraints.
- No thumbnails, media, transcripts, or full content during broad backfill unless specifically justified.

## Conditions
Pause or reduce work for Low Power Mode, cellular preference, low storage, thermal pressure, poor connection, or iOS task expiration.

## Adaptive feature thresholds
A section appears only when it can provide meaningful variety. Thresholds are configuration, not UI. Consider unique sources, recency, confidence, and diversity—not just raw count.

## User communication
Use: `Your Gazette Library continues to grow as you explore.` Never show technical backfill queues.
