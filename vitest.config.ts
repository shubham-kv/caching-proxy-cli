import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 30 * 1000,
    testTimeout: 30 * 1000
  },
});
