import { NextFunction, Request, Response } from "express";
import path from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

export const cache: Record<string, any> = {};

export function cacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cacheKey = req.path;

  if (cacheKey in cache) {
    const cachedResponse = cache[cacheKey];
    res.setHeader("X-Cache", "HIT");
    res.json(cachedResponse);
    return;
  }

  next();
}

export async function fileCacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cachedFilePath = path.join(__dirname, "../cache", req.path);

  if (existsSync(cachedFilePath)) {
    const data = await readFile(cachedFilePath, "utf-8");
    res.setHeader("X-Cache", "HIT").status(200).send(data);
    return;
  }

  next();
}
