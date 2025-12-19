import { defineConfig, type Options } from "tsup"
import { baseConfig } from "../../tsup.config.js"

export const cliConfig: Options = {
  ...baseConfig,
  dts: false,
  entry: {
    "bin/cli": "bin/cli.ts",
  },
}

export default defineConfig(cliConfig)
