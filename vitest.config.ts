import { config } from "dotenv"
import { defineConfig } from "vitest/config"

// Load .env and .env.local for E2E tests (e.g., NPM_TOKEN for Docker tests)
config({ path: ".env" })
config({ path: ".env.local" })

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
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/*.tsx",
        "e2e/**",
        "benchmarks/**",
        "examples/**",
        "scripts/**",
        "demo/**",
        "docs/**",
        "apps/runtime/src/state-machine/machine.ts",
      ],
    },
  },
})
