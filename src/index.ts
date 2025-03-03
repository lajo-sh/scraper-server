import "dotenv/config";
import express from "express";
import expressWs from "express-ws";
import Redis from "ioredis";
import fs from "node:fs";
import axios from "axios";

const urls = JSON.parse(fs.readFileSync("urls.json", "utf-8"));

const API_KEY = process.env.API_KEY!;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY!;
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";
const REDIS_URL = process.env.REDIS_URL!;

const app = expressWs(express()).app;
const redis = new Redis(REDIS_URL);

const URL_QUEUE_KEY = "url_queue";

const waitingClients: ((url: string) => void)[] = [];

interface ActiveUrl {
  url: string;
  timestamp: number;
  clientId: string;
}

let activeUrls: ActiveUrl[] = [];

async function getNextUrl(): Promise<string | null> {
  // Pop URL from the left side of the Redis list
  const url = await redis.lpop(URL_QUEUE_KEY);

  if (url) {
    return url;
  }

  return new Promise((resolve) => {
    waitingClients.push((url) => {
      resolve(url);
    });
  });
}

async function handleScanResult(
  clientId: string,
  url: string,
  isPhishing: boolean,
  explanation: string,
) {
  activeUrls = activeUrls.filter((active) => active.clientId !== clientId);

  await axios.post(
    `${process.env.BACKEND_URL}/submit-phishing`,
    {
      url,
      isPhishing,
      explanation,
    },
    {
      headers: {
        "x-api-key": BACKEND_API_KEY,
      },
    },
  );

  console.log(`Scan result for ${url}: ${isPhishing ? "Phishing" : "Safe"}`);
}

app.use(express.json());

app.post("/add-url", async (req, res) => {
  if (req.headers["x-api-key"] !== API_KEY) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const { url } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  // Push URL to the right side of the Redis list
  await redis.rpush(URL_QUEUE_KEY, url);

  if (waitingClients.length > 0) {
    const resolve = waitingClients.shift();
    resolve!(url);
  }

  res.json({ message: "URL added successfully" });
});

app.ws("/connect", async (ws, req) => {
  if (req.headers["x-api-key"] !== API_KEY) {
    ws.close();
    return;
  }

  const clientId = Math.random().toString(36).substring(7);
  console.log(`New client connected: ${clientId}`);

  let initialUrl = await getNextUrl();
  if (initialUrl) {
    activeUrls.push({
      url: initialUrl,
      timestamp: Date.now(),
      clientId,
    });
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
      );

      const nextUrl = await getNextUrl();

      if (nextUrl) {
        activeUrls.push({
          url: nextUrl,
          timestamp: Date.now(),
          clientId,
        });
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
    activeUrls = activeUrls.filter((active) => active.clientId !== clientId);
  });
});

app.listen(PORT as number, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});
