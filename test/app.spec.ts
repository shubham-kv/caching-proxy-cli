import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "path";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { StartCommandOptions } from "./types";

describe("caching-proxy-cli", () => {
  describe("start command", () => {
    const invalidOptions: StartCommandOptions[] = [
      { origin: "", port: "" },
      { origin: "Not an href", port: "" },
      { origin: "file://foo/bar/foobar.txt", port: "" },
      { origin: "htpp://localhost:3000/", port: "" },
      { origin: "https://example.com", port: "Not a number" },
      { origin: "https://example.com", port: "001a" },
      { origin: "https://example.com", port: "-1" },
      { origin: "https://example.com", port: "65536" },
    ];

    describe.each(invalidOptions)(
      "when executed with invalid origin $origin or invalid port $port",
      (options) => {
        let proxyChildProcess: ChildProcessWithoutNullStreams;

        beforeAll(() => {
          proxyChildProcess = spawn("ts-node", [
            path.join(__dirname, "../src/cli.ts"),
            "start",
            options.origin,
            "-p",
            options.port,
          ]);
        });

        afterAll(() => {
          proxyChildProcess?.kill("SIGHUP");
        });

        test("should display error", async () => {
          const data = await new Promise<string>((resolve, reject) => {
            const timeout = 5 * 1000;
            const listener = (data: any) => {
              resolve(data.toString());
            };
            proxyChildProcess.stderr.once("data", listener);

            setTimeout(() => {
              const err = new Error(
                `Failed to receive proxyChildProcess.stderr 'data' event within ${
                  timeout / 1000
                }s`
              );
              reject(err);
            }, timeout);
          });

          expect(data).toMatch(/invalid /gi);
        });
      }
    );
  });
});
