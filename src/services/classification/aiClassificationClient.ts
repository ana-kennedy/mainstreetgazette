import type { ClassificationResult } from "../../types/classificationTypes";

export interface AiClassificationClient {
  classifyContentItem(input: { title: string; summary?: string | null; sourceName: string }): Promise<Partial<ClassificationResult> | null>;
  classifyCluster(input: { headline: string; sourceCount: number; topics: string[] }): Promise<Partial<ClassificationResult> | null>;
}

export class NoopAiClassificationClient implements AiClassificationClient {
  async classifyContentItem(): Promise<Partial<ClassificationResult> | null> {
    return null;
  }
  async classifyCluster(): Promise<Partial<ClassificationResult> | null> {
    return null;
  }
}

// Replace this with a real provider (Claude API, OpenAI, etc.) when ready.
// The interface is intentionally narrow so the News tab never imports a specific AI SDK.
export const defaultAiClient: AiClassificationClient = new NoopAiClassificationClient();
