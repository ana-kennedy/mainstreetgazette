// Phase 61 — Reliability: in-memory diagnostic event ring buffer.
// Surfaces actionable signals to the Analytics screen and ErrorBoundary without
// sending data off-device.

export type DiagnosticLevel = "info" | "warn" | "error";

export interface DiagnosticEvent {
  id: string;
  level: DiagnosticLevel;
  tag: string;
  message: string;
  detail?: string;
  timestamp: string;
}

const MAX_EVENTS = 200;
let events: DiagnosticEvent[] = [];
let nextId = 0;

export function logDiagnostic(
  level: DiagnosticLevel,
  tag: string,
  message: string,
  detail?: string,
): void {
  const event: DiagnosticEvent = {
    id: String(++nextId),
    level,
    tag,
    message,
    detail,
    timestamp: new Date().toISOString(),
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();

  if (__DEV__) {
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
    console.log(`[DIAG] ${prefix} [${tag}] ${message}`, detail ?? "");
  }
}

export function getDiagnosticEvents(level?: DiagnosticLevel): DiagnosticEvent[] {
  return level ? events.filter((e) => e.level === level) : [...events];
}

export function getRecentDiagnosticEvents(limit = 50): DiagnosticEvent[] {
  return events.slice(-limit);
}

export function clearDiagnosticEvents(): void {
  events = [];
}

export function diagnosticSummary(): { total: number; errors: number; warnings: number } {
  return {
    total: events.length,
    errors: events.filter((e) => e.level === "error").length,
    warnings: events.filter((e) => e.level === "warn").length,
  };
}
