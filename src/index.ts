import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import { middlewareLogResponses, middlewareMetricsInc } from "./middleware.js";
import { handlerMetrics } from "./api/metrics.js";
import { handlerReset } from "./api/reset.js";
import { handlerValidateChirp } from "./api/chirps.js";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Log every response with a non-OK status code
app.use(middlewareLogResponses);

// Website
app.use("/app", middlewareMetricsInc, express.static("./src/app"));

// API
app.get("/api/healthz", handlerReadiness);
app.post("/api/validate_chirp", handlerValidateChirp);

// Admin
app.get("/admin/metrics", handlerMetrics);
app.post("/admin/reset", handlerReset);

app.listen(PORT, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${PORT}`);
});