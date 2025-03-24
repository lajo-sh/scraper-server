import "dotenv/config";

export const API_KEY = process.env.API_KEY!;
export const BACKEND_API_KEY = process.env.BACKEND_API_KEY!;
export const PORT = process.env.PORT || 8000;
export const HOST = process.env.HOST || "0.0.0.0";
export const REDIS_URL = process.env.REDIS_URL!;
export const BACKEND_URL = process.env.BACKEND_URL!;
export const URL_QUEUE_KEY = "url_queue";
