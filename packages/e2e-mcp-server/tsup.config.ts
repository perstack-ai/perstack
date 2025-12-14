import { defineConfig, type Options } from "tsup"
import { baseConfig } from "../../tsup.config.js"
export const e2eMcpServerConfig: Options = {
  ...baseConfig,
  entry: {
    "bin/server": "bin/server.ts",
    "src/index": "src/index.ts",
  },
}
export default defineConfig(e2eMcpServerConfig)


