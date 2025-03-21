import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "path";
import { existsSync, rmSync } from "fs";
import { ChildProcessWithoutNullStreams, spawn, spawnSync } from "child_process";
import axios, { AxiosInstance, AxiosResponse } from "axios";

import { sampleData } from "./__fixtures__/sample-data";
import { setupMockServer } from "./setup";
import { testCacheDirPath } from "../src/constants";

import { ReqResConfig, StartCommandOptions } from "./types";

describe("caching-proxy-cli", () => {
  const originHost = "localhost";
  const originPort = 3000;
  const originHref = `http://${originHost}:${originPort}`;
  const proxyServerHost = "localhost";
  const proxyPort = "4000";
  const proxyHref = `http://${proxyServerHost}:${proxyPort}`;

  const reqResConfigs: ReqResConfig[] = [
    {
      requestPath: "/api/sample-json",
      responseContentType: "application/json",
      responseData: sampleData.json,
    },
    {
      requestPath: "/api/sample-xml",
      responseContentType: "application/xml",
      responseData: sampleData.xml,
    },
    {
      requestPath: "/api/sample-plain-txt",
      responseContentType: "text/plain",
      responseData: sampleData.plainTxt,
    },
    {
      requestPath: "/public/sample-html",
      responseContentType: "text/html",
      responseData: sampleData.html,
    },
    {
      requestPath: "/public/sample-styles.css",
      responseContentType: "text/css",
      responseData: sampleData.css,
    },
    {
      requestPath: "/public/sample-script",
      responseContentType: "application/javascript",
      responseData: sampleData.javascript,
    },
  ];

  describe("start command with invalid options", () => {
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

  describe("start command with valid options", () => {
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

    describe.each(reqResConfigs)(
      "when proxy server is fetched for $responseContentType response content type API",
      (config) => {
        let axiosInstance: AxiosInstance;

        beforeAll(() => {
          axiosInstance = axios.create({
            baseURL: proxyHref,
          });

          if (existsSync(testCacheDirPath)) {
            rmSync(testCacheDirPath, { force: true, recursive: true });
          }
        });

        afterAll(() => {
          if (existsSync(testCacheDirPath)) {
            rmSync(testCacheDirPath, { force: true, recursive: true });
          }
        });

        describe("when fetched for the first time", () => {
          let response: AxiosResponse<any, any>;

          beforeAll(async () => {
            response = await axiosInstance.get(config.requestPath);
          });

          test("should return correct response", () => {
            if (typeof response.data === "object") {
              expect(response.data).toMatchObject(config.responseData);
            } else {
              expect(response.data).toBe(config.responseData);
            }
          });

          test("should have X-Cache header set to 'MISS'", () => {
            const xCacheHeader =
              response.headers["X-Cache"] || response.headers["x-cache"];
            expect(xCacheHeader).toBe("MISS");
          });
        });

        describe("when fetched for again for the second time", () => {
          let response: AxiosResponse<any, any>;

          beforeAll(async () => {
            response = await axiosInstance.get(config.requestPath);
          });

          test("should return correct response", () => {
            if (typeof response.data === "object") {
              expect(response.data).toMatchObject(config.responseData);
            } else {
              expect(response.data).toBe(config.responseData);
            }
          });

          test("should have X-Cache header set to 'HIT'", () => {
            const xCacheHeader =
              response.headers["X-Cache"] || response.headers["x-cache"];
            expect(xCacheHeader).toBe("HIT");
          });
        });
      }
    );
  });

  describe("'clear-cache' command", () => {
    let proxyChildProcess: ChildProcessWithoutNullStreams;

    setupMockServer({ host: originHost, port: originPort });

    beforeAll(async () => {
      proxyChildProcess = spawn("ts-node", [
        path.join(__dirname, "../src/cli.ts"),
        "start",
        originHref,
        "-p",
        proxyPort,
      ]);

      // Wait for the proxy server to start
      await new Promise<void>((resolve, reject) => {
        const timeout = 5 * 1000;

        proxyChildProcess.stdout.once("data", (chunk: any) => {
          const data = chunk.toString();

          if (/caching proxy running/gi.test(data)) {
            resolve();
          } else {
            reject(new Error("Unexpected stdout data"));
          }
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

    afterAll(() => {
      const res = proxyChildProcess?.kill("SIGTERM");
      console.log(
        `Kill ${res ? "succeeded" : "failed"} for the spawned process`
      );
    });

    describe("when 'clear-cache' command is executed and no cache exists", () => {
      let data: string | undefined = undefined

      beforeAll(() => {
        const buffer = spawnSync("ts-node", [
          path.join(__dirname, "../src/cli.ts"),
          "clear-cache",
        ]);

        data = buffer.stderr.toString()
      })

      test("should display the 'No cache' message", () => {
        expect(data).toMatch(/no cache/gi)
      });
    });

    describe("when 'clear-cache' command is executed and there's some cache", () => {
      let data: string | undefined = undefined

      beforeAll(async () => {
        // Make a request to have something in cache directory to delete
        const axiosInstance = axios.create({
          baseURL: proxyHref,
        });

        try {
          await axiosInstance.get(reqResConfigs[0].requestPath);
        } catch (e) {
          throw e;
        }

        // Run the clear-cache command
        const buffer = spawnSync("ts-node", [
          path.join(__dirname, "../src/cli.ts"),
          "clear-cache",
        ]);

        data = buffer.stdout.toString()
      })

      test("should clear the cache directory", () => {
        expect(data).toMatch(/cleared the cache successfully/gi)
      });
    });
  });
});
