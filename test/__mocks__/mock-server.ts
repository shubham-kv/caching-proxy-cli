import { createServer } from "http";

export const mockServer = createServer((req, res) => {
  if (req.method !== "GET") {
    throw new Error(`Unsupported request method '${req.method}'`);
  }

  switch (req.url) {
    default: {
      res.statusCode = 400;
      res.end(`Cannot ${req.method} ${req.url}`);
    }
  }
});
