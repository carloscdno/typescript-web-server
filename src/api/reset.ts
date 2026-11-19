import type { Request, Response } from "express";
import { config } from "../config.js";

export function handlerReset(_req: Request, res: Response): void {
  config.api.fileserverHits = 0;
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}