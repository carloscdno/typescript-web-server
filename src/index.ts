import express from "express";
import type { Request, Response, NextFunction } from "express";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Serve static files from the current working directory
app.use(express.static("."));

app.listen(PORT, (error?: Error) => {
  if (error) throw error;
  console.log(`Server listening on http://localhost:${PORT}`);
});