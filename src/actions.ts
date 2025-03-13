import path from "path";
import { createWriteStream, existsSync } from "fs";
import { mkdir } from "fs/promises";
import axios, { AxiosError, AxiosResponse } from "axios";
import { Command } from "@commander-js/extra-typings";

import { app } from "./app";
import { setupCacheMiddleware, readFileCache } from "./middlewares";
import { CacheRecord } from "./types";

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
    } catch (e) {
      console.error("Something went wrong");
      console.log(e);

      if (e instanceof AxiosError) {
        if (e.response) {
          res.setHeader("X-Cache", "MISS");
          res.sendStatus(e.response.status);
          return;
        }
      }

      res.status(500).send("Something went wrong");
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
      const cacheFilePath = path.join(__dirname, "../cache", req.path);
      const parsedPath = path.parse(path.normalize(cacheFilePath));

      if (!existsSync(parsedPath.dir)) {
        try {
          await mkdir(parsedPath.dir, { recursive: true });
        } catch (e) {
          console.log(`Failed to create cache directory '${parsedPath.dir}'`);
          console.error(e);
          res.status(500).send("Something went wrong");
          return;
        }
      }

      const writeStream = createWriteStream(cacheFilePath, "utf-8");
      upstreamResponse.data.pipe(writeStream);

      writeStream.on("error", (e) => {
        console.error("Received an error while streaming the response");
        console.error(e);
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
      console.error(e);
    } else {
      console.log(`Caching proxy running on http://localhost:${port}`);
    }
  });
}
