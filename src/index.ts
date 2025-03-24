import "dotenv/config";
import express from "express";
import expressWs from "express-ws";
import { HOST, PORT } from "./config";
import apiRoutes from "./routes/apiRoutes";
import { setupWebSocketRoutes } from "./routes/wsRoutes";

const app = expressWs(express()).app;

app.use(express.json());

app.use(apiRoutes);

setupWebSocketRoutes(app);

app.listen(PORT as number, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});
