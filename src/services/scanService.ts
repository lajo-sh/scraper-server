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

export async function handleScanResult(
  clientId: string,
  url: string,
  isPhishing: boolean,
  explanation: string,
  confidence: number,
): Promise<void> {
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
}
