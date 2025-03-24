import Redis from "ioredis";
import { REDIS_URL, URL_QUEUE_KEY } from "../config";

const redis = new Redis(REDIS_URL);
const waitingClients: ((url: string) => void)[] = [];

export async function addToQueue(url: string): Promise<void> {
  await redis.rpush(URL_QUEUE_KEY, url);

  if (waitingClients.length > 0) {
    const resolve = waitingClients.shift();
    resolve!(url);
  }
}

export async function getNextUrl(): Promise<string | null> {
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
