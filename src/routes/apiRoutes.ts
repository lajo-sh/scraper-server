import express from "express";
import { API_KEY } from "../config";
import { addToQueue } from "../services/queueService";

const router = express.Router();

router.post("/add-url", async (req, res) => {
  if (req.headers["x-api-key"] !== API_KEY) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const { url } = req.body;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  await addToQueue(url);
  res.json({ message: "URL added successfully" });
});

export default router;
