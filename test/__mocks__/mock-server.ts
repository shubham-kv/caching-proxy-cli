import { createServer } from "http";
import { sampleData } from "../__fixtures__/sample-data";

export const mockServer = createServer((req, res) => {
  if (req.method !== "GET") {
    throw new Error(`Unsupported request method '${req.method}'`);
  }

  switch (req.url) {
    case "/api/sample-json": {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(sampleData.json));
      break;
    }
    case "/api/sample-xml": {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml");
      res.end(sampleData.xml);
      break;
    }
    case "/api/sample-plain-txt": {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      res.end(sampleData.plainTxt);
      break;
    }
    case "/public/sample-html": {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(sampleData.html);
      break;
    }
    case "/public/sample-styles.css": {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/css");
      res.end(sampleData.css);
      break;
    }
    case "/public/sample-script": {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/javascript");
      res.end(sampleData.javascript);
      break;
    }
    default: {
      res.statusCode = 400;
      res.end(`Cannot ${req.method} ${req.url}`);
    }
  }
});
