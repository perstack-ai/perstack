import dotenv from "dotenv"

export function getEnv(envPath: string[]): Record<string, string> {
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env)
      .filter(([_, value]) => !!value)
      .map(([key, value]) => [key, value as string]),
  )
  dotenv.config({ path: envPath, processEnv: env, quiet: true })
  return env
}
