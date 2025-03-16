import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "path";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { setupMockServer } from "./setup";
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

  describe("start command", () => {
    const originHost = "localhost";
    const originPort = 3000;
    const originHref = `http://${originHost}:${originPort}`;
    const proxyServerHost = "localhost";
    const proxyPort = "4000";
    const proxyHref = `http://${proxyServerHost}:${proxyPort}`;

    let proxyChildProcess: ChildProcessWithoutNullStreams;

    setupMockServer({ host: originHost, port: originPort });

    afterAll(() => {
      const res = proxyChildProcess?.kill("SIGTERM");
      console.log(
        `Kill ${res ? "succeeded" : "failed"} for the spawned process`
      );
    });

    describe("when executed with valid origin & port", () => {
      let stdoutData: string;

      beforeAll(async () => {
        proxyChildProcess = spawn("ts-node", [
          path.join(__dirname, "../src/cli.ts"),
          "start",
          originHref,
          "-p",
          proxyPort,
        ]);

        stdoutData = await new Promise<string>((resolve, reject) => {
          const timeout = 5 * 1000;

          proxyChildProcess.stdout.once("data", (data: any) => {
            resolve(data.toString());
          });

          setTimeout(() => {
            const err = new Error(
              `Failed to receive proxyChildProcess.stdout 'data' event within ${
                timeout / 1000
              }s`
            );
            reject(err);
          }, timeout);
        });
      });

      test("proxy server should start", async ({ expect }) => {
        expect(stdoutData).toMatch(/caching proxy running/gi);
      });
    });
  });
});
