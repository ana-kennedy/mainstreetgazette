# Phase 03 — Gazette Reader and Unified Content Experiences

## Goal
Give articles, podcasts, videos, and social items a consistent Gazette experience without forcing all content into a single news-event cluster.

## Internal page types
- Story Hub: multiple items tied to a meaningful news event.
- Standalone Feature: podcast episode, weekly roundup, video, guide, or social item not tied to one event.
- Collection: curated destination, event, or user-created grouping.

Do not expose these internal type names unless useful.

## Article behavior
- Open Gazette Reader first.
- Show complete clean article text when legally and technically available.
- If only a summary is available, show it clearly and provide one prominent `Continue to Original Story` action.
- Never bypass paywalls, authentication, or publisher restrictions.
- Provide `Open Original Website` and system browser choice.

## Podcast behavior
- Play/resume control, duration and progress.
- Episode description, topics discussed, related coverage when thresholds are met, related episodes.

## Video behavior
- Play/resume control, duration, description, mentioned destinations/topics, related coverage when useful.

## Social behavior
- Present the post text and media description cleanly.
- Link to the original platform for full conversation.
- Do not scrape or present replies without a permitted source.

## Enrichment
Only show Did You Know, related locations, timeline, related stories, videos, or podcasts when confidence and content thresholds are met.
