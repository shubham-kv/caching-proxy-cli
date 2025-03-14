import { NextFunction, Request, Response } from "express";
import path from "path";
import { existsSync } from "fs";
import { readdir } from "fs/promises";

export async function readFileCache(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const decodedReqPath = decodeURIComponent(req.path);
  const extname = path.extname(decodedReqPath);
  let cacheFilePath = path.join(__dirname, "../cache", decodedReqPath);

  if (!extname) {
    try {
      const fileNames = await readdir(cacheFilePath);
      const indexFileName = fileNames.find((file) => file.startsWith("index"));

      if (indexFileName) {
        cacheFilePath = path.join(cacheFilePath, indexFileName);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (existsSync(cacheFilePath)) {
    res.setHeader("X-Cache", "HIT").status(200).sendFile(cacheFilePath);
    return;
  }

  next();
}
