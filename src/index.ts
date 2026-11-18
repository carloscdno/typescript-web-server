import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import { middlewareLogResponses, middlewareMetricsInc } from "./middleware.js";
import { handlerMetrics } from "./api/metrics.js";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Log every response with a non-OK status code
app.use(middlewareLogResponses);

// Count hits, then serve static files from ./src/app under /app
app.use("/app", middlewareMetricsInc, express.static("./src/app"));

// Readiness endpoint
app.get("/healthz", handlerReadiness);

app.get("/metrics", handlerMetrics);

app.listen(PORT, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${PORT}`);
});