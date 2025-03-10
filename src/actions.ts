import { Command } from "@commander-js/extra-typings";
import { app } from "./app";
import { cache, cacheMiddleware } from "./middlewares";

type StartCommand = Command<[string], { port: number }, {}>;

export function startServer(this: StartCommand) {
  const [origin] = this.processedArgs;
  const options = this.opts();

  app.get("*", cacheMiddleware, async (req, res) => {
    const path = req.path;
    const originResponse = await fetch(origin + path);
    const jsonData = await originResponse.json();

    cache[req.path] = jsonData;

    res.setHeader("X-Cache", "MISS");
    res.json(jsonData);
  });

  app.listen(options.port, (e) => {
    if (e) {
      console.error(e);
    } else {
      console.log(`Caching proxy running on http://localhost:${options.port}`);
    }
  });
}
