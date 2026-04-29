import catalog from "../assets/data/sources.json";
import type { Source } from "../domain/models";

export function loadBundledSources(): Source[] {
  return (catalog as Source[]).map((source) => ({ ...source }));
}
