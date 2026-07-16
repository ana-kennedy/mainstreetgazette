// Phase 62 — Quality Automation: lightweight runtime accessibility audit.
// Call auditFeedItems() in dev builds to surface items missing required a11y data.

import type { FeedItem, Source } from "../domain/models";
import { logDiagnostic } from "../services/diagnosticLogger";

export interface AuditIssue {
  itemId: string;
  field: string;
  severity: "error" | "warn";
  message: string;
}

export function auditFeedItem(item: FeedItem, source?: Source): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!item.title || item.title.trim().length === 0) {
    issues.push({ itemId: item.id, field: "title", severity: "error", message: "Missing title" });
  } else if (item.title.length > 200) {
    issues.push({ itemId: item.id, field: "title", severity: "warn", message: "Title exceeds 200 chars — may be truncated in VoiceOver" });
  }

  if (!item.sourceID) {
    issues.push({ itemId: item.id, field: "sourceID", severity: "error", message: "Missing sourceID" });
  }

  if (!item.publishedAt) {
    issues.push({ itemId: item.id, field: "publishedAt", severity: "error", message: "Missing publishedAt — relative time will fail" });
  }

  if (item.contentType === "podcast" && !item.durationSeconds) {
    issues.push({ itemId: item.id, field: "durationSeconds", severity: "warn", message: "Podcast missing duration" });
  }

  if (item.contentType === "video" && !item.thumbnailURL && !item.artworkURL) {
    issues.push({ itemId: item.id, field: "thumbnailURL", severity: "warn", message: "Video missing thumbnail" });
  }

  if (!item.canonicalURL) {
    issues.push({ itemId: item.id, field: "canonicalURL", severity: "error", message: "Missing canonicalURL — article cannot be opened" });
  }

  return issues;
}

export function auditFeedItems(items: FeedItem[], sources: Map<string, Source>): AuditIssue[] {
  const allIssues: AuditIssue[] = [];
  for (const item of items) {
    const source = sources.get(item.sourceID);
    const issues = auditFeedItem(item, source);
    allIssues.push(...issues);
    for (const issue of issues) {
      logDiagnostic(issue.severity, "a11yAudit", issue.message, `item:${item.id} field:${issue.field}`);
    }
  }
  return allIssues;
}

export function auditSummary(issues: AuditIssue[]): { errors: number; warnings: number; totalItems: number } {
  return {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warn").length,
    totalItems: new Set(issues.map((i) => i.itemId)).size,
  };
}
