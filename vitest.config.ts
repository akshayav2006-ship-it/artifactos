import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "src/**/*.test.ts", "server/**/*.test.ts", "shared/**/*.test.ts"],
    server: { deps: { inline: ["@convex-dev/agent"] } },
  },
});
