import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
        },
      },
      {
        test: {
          name: "e2e",
          globals: true,
          environment: "node",
          include: ["e2e/**/*.test.ts"],
          testTimeout: 300000,
          hookTimeout: 300000,
          pool: "forks",
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
          teardownTimeout: 10000,
        },
      },
    ],
    coverage: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/test/**",
        "packages/runtime/src/runtime.ts",
        "packages/runtime/src/skill-manager.ts",
        "packages/base/bin/server.ts",
        "packages/base/src/tools/*.ts",
        "packages/perstack/**",
        "packages/tui/**",
        "packages/api-client/v1/client.ts",
        "packages/core/src/schemas/skill-manager.ts",
        "packages/core/src/index.ts",
        "packages/runtime/src/index.ts",
        "packages/api-client/v1/index.ts",
      ],
    },
  },
})
