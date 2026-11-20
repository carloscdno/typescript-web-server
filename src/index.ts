import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import { middlewareLogResponses, middlewareMetricsInc, middlewareErrorHandler } from "./middleware.js";
import { handlerMetrics } from "./api/metrics.js";
import { handlerReset } from "./api/reset.js";
import { config } from "./config.js";
import { handlerCreateUser } from "./api/users.js";
import { handlerCreateChirp, handlerGetChirps, handlerGetChirp } from "./api/chirps.js";

const app = express();

// Log every response with a non-OK status code
app.use(middlewareLogResponses);

// Parse JSON request bodies into req.body
app.use(express.json());

// Website
app.use("/app", middlewareMetricsInc, express.static("./src/app"));

// API
app.get("/api/healthz", handlerReadiness);
app.post("/api/users", handlerCreateUser);
app.post("/api/chirps", handlerCreateChirp);
app.get("/api/chirps", handlerGetChirps);
app.get("/api/chirps/:chirpId", handlerGetChirp);

// Admin
app.get("/admin/metrics", handlerMetrics);
app.post("/admin/reset", handlerReset);

// Middleware error handler
app.use(middlewareErrorHandler);

app.listen(config.api.port, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${config.api.port}`);
});