import path from "path";
import { createWriteStream, existsSync } from "fs";
import { mkdir } from "fs/promises";
import axios, { AxiosError, AxiosResponse } from "axios";

import { Command } from "@commander-js/extra-typings";

import { app } from "./app";
import { cache, cacheMiddleware, fileCacheMiddleware } from "./middlewares";

type StartCommand = Command<[string], { port: number }, {}>;

export function startServer(this: StartCommand) {
  const [origin] = this.processedArgs;
  const { port } = this.opts();

  const axiosInstance = axios.create({ baseURL: origin });

  app.get("*", cacheMiddleware, fileCacheMiddleware, async (req, res) => {
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
          res.status(e.response.status).send("Bad Request");
          return;
        } else if (e.request) {
        } else {
        }
      }

      res.status(500).send("Something went wrong");
      return;
    }

    // ** 2. Set the response headers
    const contentType = upstreamResponse.headers["content-type"] as string;

    const headers = new Headers();
    Object.entries(upstreamResponse.headers).forEach(([header, value]) => {
      headers.set(header, value);
    });
    headers.set("X-Cache", "MISS");
    res.setHeaders(headers);

    // ** 3. Cache upstream response & send back response to client with X-Cache MISS header
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
        res.status(upstreamResponse.status).sendFile(cacheFilePath);
      });
    } else {
      throw new Error('Yet to implement')
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
