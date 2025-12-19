import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["bin/cli.ts"],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  outExtension: () => ({ js: ".js" }),
  banner: { js: "#!/usr/bin/env node" },
})
