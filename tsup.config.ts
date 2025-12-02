import { defineConfig, type Options } from "tsup"

export const baseConfig: Options = {
  clean: true,
  dts: true,
  entry: {
    "src/index": "src/index.ts",
  },
  format: ["esm"],
  sourcemap: true,
  minify: false,
  target: "node22",
  outDir: "dist",
  treeshake: true,
}

export default defineConfig(baseConfig)
