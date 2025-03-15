import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "path";
import {
  ChildProcessWithoutNullStreams,
  spawn,
} from "child_process";

const originServer = "https://pokeapi-proxy.freecodecamp.rocks/";
const port = "3001"

describe("caching-proxy-cli", () => {
  describe("start command", () => {
    let childProcess: ChildProcessWithoutNullStreams;

    beforeAll(async () => {
      childProcess = spawn("ts-node", [
        path.join(process.cwd(), "src/cli.ts"),
        "start",
        originServer,
        "-p",
        port,
      ]);

      await new Promise<void>((resolve, reject) => {
        childProcess.stdout.on("data", (data) => {
          const dataString: string = data.toString()

          if (dataString.match(/caching proxy running/gi)) {
            resolve();
          } else {
            reject(new Error(`Invalid stdout data: ${data}`))
          }
        });

        childProcess.stderr.on("data", (data) => {
          reject(new Error(`Error spawning the process: ${data}`));
        });

        childProcess.on("close", (code) => {
          reject(new Error(`Spawned process exited with code ${code}`));
        });

        setTimeout(() => {
          reject(new Error(`Failed to spawn the process within 10s`))
        }, 10 * 1000)
      });
    });

    afterAll(() => {
      const res = childProcess?.kill("SIGTERM");
      console.log(
        `Kill ${res ? "succeeded" : "failed"} for the spawned process`
      );
    });

    describe("when proxy server is fetched for the first time", () => {
      let response: Response

      beforeAll(async () => {
        response = await fetch(`http://localhost:${port}/api/pokemon`);
      });

      test("should return X-CACHE MISS header", async () => {
        const cacheHeader = response.headers.get("X-CACHE");
        expect(cacheHeader).toBe("MISS");
      });
    });
  });
});
