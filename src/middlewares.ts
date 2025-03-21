import { NextFunction, Request, Response } from "express";
import path from "path";
import { existsSync } from "fs";
import { readdir } from "fs/promises";

import { logger } from "./logger";

export function getReadFileCacheMiddleware(cacheDirectory: string) {
  return async function readFileCache(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const decodedReqPath = decodeURIComponent(req.path);
    const extname = path.extname(decodedReqPath);
    const cachePath = path.join(cacheDirectory, decodedReqPath);

    if (existsSync(cachePath)) {
      if (extname) {
        res.setHeader("X-Cache", "HIT").status(200).sendFile(cachePath);
        return;
      } else {
        let cacheDirFileNames: string[] = [];
        let cachePathWithExt: string | undefined = undefined;

        try {
          cacheDirFileNames = await readdir(cachePath);
        } catch (e) {
          logger.error(
            "Something went wrong while reading the cache directory"
          );
          logger.debug(e);
        }

        if (cacheDirFileNames.length > 0) {
          const indexFileName = cacheDirFileNames.find((file) =>
            file.startsWith("index")
          );

          if (indexFileName) {
            cachePathWithExt = path.join(cachePath, indexFileName);
          }
        }

        if (cachePathWithExt && existsSync(cachePathWithExt)) {
          res
            .setHeader("X-Cache", "HIT")
            .status(200)
            .sendFile(cachePathWithExt);
          return;
        }
      }
    }

    next();
  };
}
