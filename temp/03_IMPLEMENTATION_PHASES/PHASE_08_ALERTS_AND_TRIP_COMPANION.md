# Phase 08 — Gazette Alerts and Trip Companion

## Gazette Alerts
Settings destination under Your Experience. Each choice includes a one-sentence description:
- Morning Edition
- Special Editions
- Disney Moments
- Trip Companion Alerts

Do not call delayed polling results breaking news. Special Editions require a high-confidence major event rule.

## Permissions
Do not force notification permission during onboarding. Introduce alerts and let the user choose later. If permission was denied, provide `Open iPhone Settings`.

## Trip Companion
Lives primarily in For You, not buried in Settings.
Fields:
- Destination
- Start date
- End date
- Optional resort
- Optional notes
- Optional linked collection, only with explicit consent

Support multiple upcoming trips.

## Reminder engine
Use versioned, externally maintainable rules for dining windows, eligible Lightning Lane windows, check-in, weather usefulness, park-hour review, and other factual milestones. Never hard-code mutable Disney policy without an effective date and destination scope.
