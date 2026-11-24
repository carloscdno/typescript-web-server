import type { Request, Response } from "express";
import { upgradeUserToChirpyRed } from "../db/queries/users.js";
import { BadRequestError, NotFoundError } from "../errors.js";
import { UUID_REGEX } from "./validation.js";

const USER_UPGRADED_EVENT = "user.upgraded";

type PolkaWebhookParams = {
  event: string;
  data: {
    userId: string;
  };
};

function hasEvent(value: unknown): value is { event: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "event" in value &&
    typeof value.event === "string"
  );
}

function isPolkaWebhookParams(value: unknown): value is PolkaWebhookParams {
  return (
    hasEvent(value) &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "userId" in value.data &&
    typeof value.data.userId === "string"
  );
}

export async function handlerPolkaWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const params: unknown = req.body;

  if (!hasEvent(params)) {
    throw new BadRequestError("Invalid request body");
  }

  // Acknowledge events we don't handle, so Polka doesn't retry them
  if (params.event !== USER_UPGRADED_EVENT) {
    res.status(204).end();
    return;
  }

  if (!isPolkaWebhookParams(params)) {
    throw new BadRequestError("Invalid request body");
  }

  const { userId } = params.data;

  // A malformed id can't belong to any user; also avoids a Postgres uuid error (500)
  if (!UUID_REGEX.test(userId)) {
    throw new NotFoundError("User not found");
  }

  const user = await upgradeUserToChirpyRed(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  res.status(204).end();
}