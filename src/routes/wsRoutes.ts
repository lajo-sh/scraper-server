import type { Application } from "express";
import type expressWs from "express-ws";
import { API_KEY } from "../config";
import { getNextUrl } from "../services/queueService";
import {
  addActiveUrl,
  handleScanResult,
  removeActiveUrl,
} from "../services/scanService";

type WebSocketApplication = Application & ReturnType<typeof expressWs>["app"];

export function setupWebSocketRoutes(app: WebSocketApplication): void {
  app.ws("/connect", async (ws, req) => {
    if (req.headers["x-api-key"] !== API_KEY) {
      ws.close();
      return;
    }

    const clientId = Math.random().toString(36).substring(7);
    console.log(`New client connected: ${clientId}`);

    const initialUrl = await getNextUrl();

    if (initialUrl) {
      addActiveUrl(clientId, initialUrl);
      ws.send(JSON.stringify({ url: initialUrl }));
    } else {
      ws.send(JSON.stringify({ status: "no_urls" }));
    }

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type !== "scan_result") {
          return;
        }

        await handleScanResult(
          clientId,
          data.url,
          data.isPhishing,
          data.explanation,
          data.confidence,
        );

        const nextUrl = await getNextUrl();

        if (nextUrl) {
          addActiveUrl(clientId, nextUrl);
          ws.send(JSON.stringify({ url: nextUrl }));
        } else {
          ws.send(JSON.stringify({ status: "no_urls" }));
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    ws.on("close", () => {
      console.log(`Client disconnected: ${clientId}`);
      removeActiveUrl(clientId);
    });
  });
}
