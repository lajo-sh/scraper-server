import axios from "axios";
import { BACKEND_API_KEY, BACKEND_URL } from "../config";

export interface ActiveUrl {
  url: string;
  timestamp: number;
  clientId: string;
}

let activeUrls: ActiveUrl[] = [];

export function addActiveUrl(clientId: string, url: string): void {
  activeUrls.push({
    url,
    timestamp: Date.now(),
    clientId,
  });
}

export function removeActiveUrl(clientId: string): void {
  activeUrls = activeUrls.filter((active) => active.clientId !== clientId);
}

// Add cleanup for stale URLs
const STALE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function cleanupStaleUrls(): void {
  const now = Date.now();
  activeUrls = activeUrls.filter((url) => {
    const isStale = now - url.timestamp > STALE_TIMEOUT;
    if (isStale) {
      console.log(`Removing stale URL ${url.url} from client ${url.clientId}`);
    }
    return !isStale;
  });
}

// Run cleanup every minute
setInterval(cleanupStaleUrls, 60 * 1000);

export async function handleScanResult(
  clientId: string,
  url: string,
  isPhishing: boolean,
  explanation: string,
  confidence: number,
): Promise<void> {
  try {
    removeActiveUrl(clientId);

    await axios.post(
      `${BACKEND_URL}/submit-phishing`,
      {
        url,
        isPhishing,
        explanation,
        confidence,
      },
      {
        headers: {
          "x-api-key": BACKEND_API_KEY,
        },
      },
    );

    console.log(`Scan result for ${url}: ${isPhishing ? "Phishing" : "Safe"}`);
  } catch (error) {
    console.error(`Error submitting scan result for ${url}:`, error);
    // Don't rethrow - we want to continue even if submission fails
  }
}
