import { defineConfig, type Options } from "tsup"
import { baseConfig } from "../../tsup.config.js"

export const apiClientConfig: Options = {
  ...baseConfig,
  entry: {
    index: "src/index.ts",
  },
}

export default defineConfig(apiClientConfig)
