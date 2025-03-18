import express from "express";

import path from "path";
import mime from "mime";
import { createWriteStream, existsSync } from "fs";
import { mkdir } from "fs/promises";
import axios, { AxiosError, AxiosResponse } from "axios";

import { getReadFileCacheMiddleware } from "./middlewares";
import { logger } from "./logger";

type ProxyOptions = {
  port: number;
  origin: string;
  cacheDirectory: string;
};

export function configureAndStartCacheProxy({
  origin,
  port,
  cacheDirectory,
}: ProxyOptions) {
  const axiosInstance = axios.create({ baseURL: origin });

  const cacheProxy = express();
  const readFileCache = getReadFileCacheMiddleware(cacheDirectory);

  cacheProxy.disable("x-powered-by");

  cacheProxy.use((req, _, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  cacheProxy.get("*", readFileCache, async (req, res) => {
    // ** 1. Get upstream response
    let upstreamResponse: AxiosResponse<any, any>;
    try {
      upstreamResponse = await axiosInstance.get(req.path, {
        responseType: "stream",
      });
    } catch (e: any) {
      const err = `${e.code}${e.message ? ": " + e.message : ""}`;
      logger.debug(e);

      if (e instanceof AxiosError) {
        if (e.response) {
          logger.error(`Received '${err}' from origin server\n`);
          res.sendStatus(e.response.status);
          return;
        } else if (e.request) {
          logger.error(`Request failed with '${err}'\n`);
          res.sendStatus(502);
          return;
        }
      }

      logger.error("Something went wrong");
      res.sendStatus(500);
      return;
    }

    // ** 2. Build the response headers
    const headers = new Headers();
    Object.entries(upstreamResponse.headers).forEach(([header, value]) => {
      headers.set(header, value);
    });

    // ** 3. Cache & send back response
    const contentType = upstreamResponse.headers["content-type"] as string;
    const extname = path.extname(req.path);

    if (!contentType) {
      logger.error(`No Content-Type header from origin server`);
      res.sendStatus(502);
      return;
    }

    const cacheFilePath = path.join(
      cacheDirectory,
      decodeURIComponent(req.path),
      !extname ? `/index.${mime.extension(contentType)}` : ""
    );
    const parsedPath = path.parse(path.normalize(cacheFilePath));

    if (!existsSync(parsedPath.dir)) {
      try {
        await mkdir(parsedPath.dir, { recursive: true });
      } catch (e) {
        logger.info(`Failed to create cache directory '${parsedPath.dir}'`);
        logger.debug(e);
        res.sendStatus(500);
        return;
      }
    }

    const writeStream = createWriteStream(cacheFilePath);
    upstreamResponse.data.pipe(writeStream);

    writeStream.on("error", (e) => {
      logger.info("Received an error while streaming the response");
      logger.debug(e);
      res.status(500).send("Something went wrong");
    });

    writeStream.on("finish", () => {
      res
        .setHeaders(headers)
        .setHeader("X-Cache", "MISS")
        .status(upstreamResponse.status)
        .sendFile(cacheFilePath);
    });
  });

  cacheProxy.listen(port, (e) => {
    if (e) {
      logger.error(e);
    } else {
      logger.info(`Caching proxy running on http://localhost:${port}/\n`);
    }
  });
}
