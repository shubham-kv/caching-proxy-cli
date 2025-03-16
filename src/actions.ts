import { Command } from "@commander-js/extra-typings";

import { configureAndStartCacheProxy } from "./proxy";
import { isIntegerString } from "./utils/string";
import { cacheDirPath, testCacheDirPath } from "./constants";

type StartCommand = Command<[string], { port: string }, {}>;

export function startServer(this: StartCommand) {
  const [origin] = this.processedArgs;
  const { port } = this.opts();

  try {
    const url = new URL(origin);
    if (!url.protocol.startsWith("http")) {
      throw new Error("Invalid origin url");
    }
  } catch (e) {
    this.error("Invalid origin url, expected http or https url.\n");
  }

  if (
    !(isIntegerString(port) && parseInt(port) >= 0 && parseInt(port) <= 65535)
  ) {
    this.error("Invalid port, must be a number from 0 to 65535.\n");
  }

  configureAndStartCacheProxy({
    origin,
    port: parseInt(port),
    cacheDirectory:
      process.env.NODE_ENV === "test" ? testCacheDirPath : cacheDirPath,
  });
}
