import path from "path";
import { Command } from "@commander-js/extra-typings";

import { configureAndStartCacheProxy } from "./proxy";

type StartCommand = Command<[string], { port: number }, {}>;

export function startServer(this: StartCommand) {
  configureAndStartCacheProxy({
    origin: this.processedArgs[0],
    port: this.opts().port,
    cacheDirectory: path.join(__dirname, "../cache"),
  });
}
