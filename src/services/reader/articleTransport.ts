export interface PublicHtmlResponse {
  finalUrl: string;
  contentType: string;
  html: string;
}

const MAX_HTML_BYTES = 1_500_000;

function assertPublicHttpsUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new Error("unsupported url scheme");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    throw new Error("restricted host");
  }
}

export class DirectArticleTransport {
  async fetchPublicHtml(url: string, signal?: AbortSignal): Promise<PublicHtmlResponse> {
    assertPublicHttpsUrl(url);
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MainStreetGazette/2026 Reader",
      },
    });
    const finalUrl = response.url || url;
    assertPublicHttpsUrl(finalUrl);

    if (response.status === 401 || response.status === 403) {
      throw new Error("forbidden");
    }
    if (!response.ok) {
      throw new Error("network");
    }

    const contentType = response.headers.get("content-type") ?? "text/html";
    if (!contentType.toLowerCase().includes("text/html")) {
      return { finalUrl, contentType, html: "" };
    }

    const html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      throw new Error("unsupported response size");
    }
    return { finalUrl, contentType, html };
  }
}
