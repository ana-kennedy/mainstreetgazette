// Phase 63 — Future Expansion: type-safe plugin registry for third-party source adapters.
// Plugins register themselves with a unique id and declare what they can produce/consume.

import type { ContentType, SourceType } from "../domain/models";

export type PluginCapability =
  | "fetchFeed"
  | "enrichItem"
  | "classifyItem"
  | "renderCard"
  | "shareDestination";

export interface PluginMetadata {
  id: string;
  displayName: string;
  version: string;
  author?: string;
  capabilities: PluginCapability[];
  supportedSourceTypes?: SourceType[];
  supportedContentTypes?: ContentType[];
}

export interface RegisteredPlugin {
  meta: PluginMetadata;
  enabled: boolean;
  registeredAt: string;
}

const registry = new Map<string, RegisteredPlugin>();

export function registerPlugin(meta: PluginMetadata): void {
  if (registry.has(meta.id)) {
    if (__DEV__) {
      console.warn(`[PluginRegistry] Plugin "${meta.id}" already registered — skipping duplicate.`);
    }
    return;
  }
  registry.set(meta.id, { meta, enabled: true, registeredAt: new Date().toISOString() });
}

export function getPlugin(id: string): RegisteredPlugin | undefined {
  return registry.get(id);
}

export function listPlugins(capability?: PluginCapability): RegisteredPlugin[] {
  const all = Array.from(registry.values());
  if (!capability) return all;
  return all.filter((p) => p.meta.capabilities.includes(capability));
}

export function enablePlugin(id: string): void {
  const plugin = registry.get(id);
  if (plugin) plugin.enabled = true;
}

export function disablePlugin(id: string): void {
  const plugin = registry.get(id);
  if (plugin) plugin.enabled = false;
}

export function unregisterPlugin(id: string): void {
  registry.delete(id);
}

export function pluginCount(): number {
  return registry.size;
}
