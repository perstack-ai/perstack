import { defineConfig, type Options } from "tsup"
import { baseConfig } from "../../tsup.config.js"

export const apiClientConfig: Options = {
  ...baseConfig,
  entry: {
    "v1/index": "v1/index.ts",
  },
}

export default defineConfig(apiClientConfig)
