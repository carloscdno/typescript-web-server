import type { Request, Response } from "express";
import { config } from "../config.js";

export function handlerMetrics(_req: Request, res: Response): void {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`Hits: ${config.fileserverHits}`);
}