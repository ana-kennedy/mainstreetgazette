import type { ReaderBlock } from "../../types/readerTypes";

const restrictedPatterns = [
  /captcha/i,
  /enable javascript/i,
  /access denied/i,
  /sign in to continue/i,
  /subscribe to continue/i,
  /paywall/i,
  /cloudflare/i,
];

function words(text: string): string[] {
  return text.match(/[A-Za-z0-9\u00C0-\uFFFF]+(?:['-][A-Za-z0-9\u00C0-\uFFFF]+)?/g) ?? [];
}

export function countBlockWords(blocks: ReaderBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "blockquote" || block.type === "imageCaption") {
      return total + words(block.text).length;
    }
    if (block.type === "unorderedList" || block.type === "orderedList") {
      return total + words(block.items.join(" ")).length;
    }
    if (block.type === "table") {
      return total + words([...block.headers, ...block.rows.flat()].join(" ")).length;
    }
    if (block.type === "linkCard") {
      return total + words([block.title, block.description].filter(Boolean).join(" ")).length;
    }
    return total;
  }, 0);
}

export function qualityForBlocks(input: {
  blocks: ReaderBlock[];
  htmlText: string;
  feedSummary?: string | null;
  minimumWordCount: number;
}): { score: number; reasons: string[]; wordCount: number; restricted: boolean } {
  const reasons: string[] = [];
  const wordCount = countBlockWords(input.blocks);
  const restricted = restrictedPatterns.some((pattern) => pattern.test(input.htmlText));

  if (restricted) reasons.push("restricted-page-pattern");
  if (wordCount < input.minimumWordCount) reasons.push("too-few-words");
  if (input.blocks.length === 0) reasons.push("no-reader-blocks");

  const summaryWords = words(input.feedSummary ?? "").join(" ").toLowerCase();
  const blockWords = words(
    input.blocks
      .map((block) => ("text" in block ? block.text : "items" in block ? block.items.join(" ") : ""))
      .join(" ")
  ).join(" ").toLowerCase();
  if (summaryWords.length > 80 && blockWords === summaryWords) {
    reasons.push("matches-feed-summary");
  }

  const score = Math.max(0, 1 - reasons.length * 0.25);
  return { score, reasons, wordCount, restricted };
}
