import { afterAll, beforeAll } from "vitest";
import { mockServer } from "./__mocks__/mock-server";

export const setupMockServer = (options: { port: number; host: string }) => {
  beforeAll(() => mockServer.listen(options.port, options.host));
  afterAll(() => mockServer.close());
};
