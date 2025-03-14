import path from "path";
import { createWriteStream, existsSync } from "fs";
import { mkdir } from "fs/promises";
import axios, { AxiosError, AxiosResponse } from "axios";
import { Command } from "@commander-js/extra-typings";

import { app } from "../app";
import { setupCacheMiddleware, readFileCache } from "../middlewares";
import { logger } from "../logger";
import { CacheRecord } from "../types";

type StartCommand = Command<[string], { port: number }, {}>;

export function startServer(this: StartCommand) {
  const [origin] = this.processedArgs;
  const { port } = this.opts();

  const cache: CacheRecord = {};
  const cacheMiddleware = setupCacheMiddleware(cache);
  const axiosInstance = axios.create({ baseURL: origin });

  app.get("*", cacheMiddleware, readFileCache, async (req, res) => {
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
    headers.set("X-Cache", "MISS");

    // ** 3. Cache & send back response
    const contentType = upstreamResponse.headers["content-type"] as string;
    const pathHasExtension = path.extname(req.path);

    if (
      pathHasExtension ||
      contentType.startsWith("text/") ||
      contentType.startsWith("image/") ||
      contentType.startsWith("audio")
    ) {
      const cacheFilePath = path.join(__dirname, "../../cache", req.path);
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

      const writeStream = createWriteStream(cacheFilePath, "utf-8");
      upstreamResponse.data.pipe(writeStream);

      writeStream.on("error", (e) => {
        logger.info("Received an error while streaming the response");
        logger.debug(e);
        res.status(500).send("Something went wrong");
      });

      writeStream.on("finish", () => {
        res
          .setHeaders(headers)
          .status(upstreamResponse.status)
          .sendFile(cacheFilePath);
      });
    } else if (
      contentType.startsWith("application/json") ||
      contentType.startsWith("application/xml")
    ) {
      const upstream = upstreamResponse.data;
      const buffers: Buffer[] = [];

      upstream.on("data", (chunk: Buffer) => {
        buffers.push(chunk);
      });

      upstream.on("end", () => {
        const data = Buffer.concat(buffers);
        cache[req.path] = { contentType, data };
        res.setHeaders(headers).status(upstreamResponse.status).send(data);
      });
    } else {
      throw new Error("Yet to implement");
    }
  });

  app.listen(port, (e) => {
    if (e) {
      logger.error(e);
    } else {
      logger.info(`Caching proxy running on http://localhost:${port}/\n`);
    }
  });
}
