import express from "express";
import type { Request, Response, NextFunction } from "express";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// No routes yet: Express falls back to its default 404 handler
app.listen(PORT, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${PORT}`);
});