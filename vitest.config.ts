import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    hookTimeout: 60 * 1000,
    testTimeout: 60 * 1000
  },
});
