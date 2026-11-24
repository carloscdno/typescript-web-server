import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import { 
  middlewareLogResponses, 
  middlewareMetricsInc, 
  middlewareErrorHandler, 
} from "./middleware.js";
import { handlerMetrics } from "./api/metrics.js";
import { handlerReset } from "./api/reset.js";
import { config } from "./config.js";
import { handlerCreateUser, handlerUpdateUser } from "./api/users.js";
import {
  handlerCreateChirp,
  handlerDeleteChirp,
  handlerGetChirp,
  handlerGetChirps,
} from "./api/chirps.js";
import { handlerLogin } from "./api/login.js";
import { handlerRefresh, handlerRevoke } from "./api/tokens.js";

const app = express();

// Log every response with a non-OK status code
app.use(middlewareLogResponses);

// Parse JSON request bodies into req.body
app.use(express.json());

// Website
app.use("/app", middlewareMetricsInc, express.static("./src/app"));

// API: health
app.get("/api/healthz", handlerReadiness);

// API: users and auth
app.post("/api/users", handlerCreateUser);
app.put("/api/users", handlerUpdateUser);
app.post("/api/login", handlerLogin);
app.post("/api/refresh", handlerRefresh);
app.post("/api/revoke", handlerRevoke);

// API: chirps
app.get("/api/chirps", handlerGetChirps);
app.post("/api/chirps", handlerCreateChirp);
app.get("/api/chirps/:chirpId", handlerGetChirp);
app.delete("/api/chirps/:chirpId", handlerDeleteChirp);

// Admin
app.get("/admin/metrics", handlerMetrics);
app.post("/admin/reset", handlerReset);

// Middleware error handler
app.use(middlewareErrorHandler);

app.listen(config.api.port, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${config.api.port}`);
});