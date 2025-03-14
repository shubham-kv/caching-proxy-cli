import express from "express";
import { logger } from "./logger";

export const app = express();

app.disable("x-powered-by");

app.use((req, _, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});
