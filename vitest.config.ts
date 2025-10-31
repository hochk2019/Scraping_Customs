import { defineConfig } from "vitest/config";
import path from "path";

const rootDir = path.resolve(import.meta.dirname);

export default defineConfig({
  root: rootDir,
  resolve: {
    alias: {
      yaml: path.resolve(rootDir, "server/__mocks__/yaml.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
});
