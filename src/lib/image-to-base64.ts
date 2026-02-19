/**
 * Fetch a remote image and return it as base64 for inline MCP content blocks.
 * Pure JS — no native dependencies (sharp etc.) so it works on Vercel serverless.
 *
 * Claude Desktop renders type:"image" content blocks up to ~1MB.
 * If the fetched image exceeds MAX_SIZE_BYTES we re-encode at lower JPEG quality
 * using the Canvas API... except we're in Node without canvas. So instead we
 * simply truncate by re-fetching at a smaller size if the provider supports it,
 * or accept the image as-is if it's within limits.
 */

const MAX_SIZE_BYTES = 800_000; // 800KB target (leaves headroom under 1MB after base64 overhead)

export interface Base64Image {
  data: string;     // base64-encoded image bytes (NO data URI prefix)
  mimeType: string; // e.g. "image/jpeg"
}

/**
 * Fetch an image URL and return base64 + mimeType.
 * If the image is larger than ~800KB, attempt JPEG quality reduction.
 * Returns null if fetch fails entirely (caller should fall back to URL-only text).
 */
export async function fetchImageAsBase64(url: string): Promise<Base64Image | null> {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'image/jpeg, image/png, image/webp, */*' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`[image-to-base64] HTTP ${response.status} fetching ${url}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If within size limit, return directly
    if (buffer.byteLength <= MAX_SIZE_BYTES) {
      return {
        data: buffer.toString('base64'),
        mimeType,
      };
    }

    // Image is too large. Try to get a smaller version by appending resize params
    // to the URL (works for many CDNs / image services). kie.ai URLs often support this.
    const smallerBuffer = await tryFetchSmaller(url);
    if (smallerBuffer && smallerBuffer.byteLength <= MAX_SIZE_BYTES) {
      return {
        data: smallerBuffer.toString('base64'),
        mimeType: 'image/jpeg', // resize endpoints typically return JPEG
      };
    }

    // Last resort: return the original even if slightly over limit.
    // Claude Desktop may still render it or gracefully degrade.
    if (buffer.byteLength <= 1_200_000) {
      return {
        data: buffer.toString('base64'),
        mimeType,
      };
    }

    // Way too large — skip inline image
    console.error(`[image-to-base64] Image too large (${buffer.byteLength} bytes), skipping inline`);
    return null;
  } catch (error) {
    console.error(`[image-to-base64] Failed to fetch image:`, (error as Error).message);
    return null;
  }
}

/**
 * Attempt to fetch a smaller version of the image by appending common CDN resize params.
 */
async function tryFetchSmaller(originalUrl: string): Promise<Buffer | null> {
  // Common resize parameter patterns used by image CDNs
  const resizeAttempts = [
    appendParam(originalUrl, 'w', '1024'),
    appendParam(originalUrl, 'width', '1024'),
    appendParam(originalUrl, 'quality', '70'),
  ];

  for (const attemptUrl of resizeAttempts) {
    try {
      const resp = await fetch(attemptUrl, {
        headers: { 'Accept': 'image/jpeg, image/png, */*' },
        signal: AbortSignal.timeout(15_000),
      });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.byteLength < MAX_SIZE_BYTES) {
          return buf;
        }
      }
    } catch {
      // Try next
    }
  }
  return null;
}

function appendParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${key}=${value}`;
}
