import { defineConfig, type Options } from "tsup"
import { baseConfig } from "../../tsup.config.js"

export const runtimeConfig: Options = {
  ...baseConfig,
  entry: {
    "bin/cli": "bin/cli.ts",
    "src/index": "src/index.ts",
  },
}

export default defineConfig(runtimeConfig)
