import { NextFunction, Request, Response } from "express";

export const cache: Record<string, any> = {};

export const cacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const cacheKey = req.path;

  if (cacheKey in cache) {
    const cachedResponse = cache[cacheKey];
    res.setHeader("X-Cache", "HIT");
    res.json(cachedResponse);
    return;
  } else {
    next();
  }
};
