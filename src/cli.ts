#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings";
import { description, version } from "../package.json";

import { clearCache, startServer } from "./actions";

const program = new Command()
  .name("caching-proxy")
  .description(description)
  .version(version);

program
  .command("start")
  .description("Start the caching proxy server")
  .argument(
    "<origin>",
    "Http/Https url of the origin server for which to cache the responses"
  )
  .requiredOption(
    "-p, --port <port>",
    "Port number on which this server will run"
  )
  .action(startServer);

program
  .command("clear-cache")
  .description("Clear the entire cache of the proxy server")
  .action(clearCache);

program.parse(process.argv);
