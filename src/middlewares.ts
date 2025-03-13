import { NextFunction, Request, Response } from "express";
import path from "path";
import { existsSync } from "fs";
import { CacheRecord } from "./types";

export function setupCacheMiddleware(cache: CacheRecord) {
  return function cacheMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const cacheKey = req.path;

    if (cacheKey in cache) {
      const cachedResponse = cache[cacheKey];

      const headers = new Headers();
      headers.set("X-Cache", "HIT");
      headers.set("Content-Type", cachedResponse.contentType);

      res.setHeaders(headers).send(cachedResponse.data);
      return;
    }

    next();
  };
}

export async function readFileCache(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const hasExtension = !!path.extname(req.path);
  const cachePath = path.join(__dirname, "../cache", req.path);

  if (hasExtension && existsSync(cachePath)) {
    res.setHeader("X-Cache", "HIT").status(200).sendFile(cachePath);
    return;
  }

  next();
}
