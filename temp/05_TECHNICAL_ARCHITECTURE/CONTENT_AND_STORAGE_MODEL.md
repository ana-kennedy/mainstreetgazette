# Content and Storage Model

## Core normalized entity
Each content item should include stable ID, type, title, publisher, publication date, canonical URL, summary, optional clean body, duration/progress, destination tags, topic tags, source confidence, freshness status, availability state, story-cluster ID, and storage tier.

## User-owned tables
Saved item references, collection membership, custom collections, pins/order, trip records, linked collections, reading/listening/watching progress, explicit offline choices, My Magic preferences.

## Automatically managed tables
Normalized metadata, source cursors, backfill state, classifications, relationships, cluster membership, freshness records, thumbnails/body cache, update provenance.

## Deletion rules
Never auto-delete user-owned rows. Optimization may remove reconstructable body text and images while retaining metadata and original URL. A saved item should retain the best available representation and be protected from aggressive cleanup.

## Adaptive section quality
Use a quality function involving unique item count, unique publisher count, confidence, recency, and content-type diversity. Configure per section. Avoid simplistic thresholds such as “show if count > 1.”
