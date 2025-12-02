import { type Options, defineConfig } from "tsup"
import { baseConfig } from "../../tsup.config.js"

export const apiClientConfig: Options = {
  ...baseConfig,
  entry: {
    "v1/index": "v1/index.ts",
  },
}

export default defineConfig(apiClientConfig)
