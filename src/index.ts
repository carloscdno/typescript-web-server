import express from "express";
import { handlerReadiness } from "./api/readiness.js";
import { middlewareLogResponses } from "./middleware.js";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Log every response with a non-OK status code
app.use(middlewareLogResponses);

// Serve static files from ./src/app under the /app prefix
app.use("/app", express.static("./src/app"));

// Readiness endpoint
app.get("/healthz", handlerReadiness);

app.listen(PORT, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${PORT}`);
});