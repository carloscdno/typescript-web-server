import express from "express";
import { handlerReadiness } from "./api/readiness.js";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Serve static files from ./src/app under the /app prefix
app.use("/app", express.static("./src/app"));

// Readiness endpoint
app.get("/healthz", handlerReadiness);

app.listen(PORT, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${PORT}`);
});