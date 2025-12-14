const SAFE_ENV_VARS = [
  "PATH",
  "HOME",
  "SHELL",
  "TERM",
  "NODE_PATH",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "http_proxy",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
  "PERSTACK_PROXY_URL",
  "NPM_CONFIG_PROXY",
  "NPM_CONFIG_HTTPS_PROXY",
]
const PROTECTED_ENV_VARS = new Set([
  "PATH",
  "HOME",
  "SHELL",
  "NODE_PATH",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "NODE_OPTIONS",
  "PYTHONPATH",
  "PERL5LIB",
  "RUBYLIB",
])
export function getFilteredEnv(additional?: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {}
  for (const key of SAFE_ENV_VARS) {
    if (process.env[key]) {
      filtered[key] = process.env[key]
    }
  }
  if (additional) {
    for (const [key, value] of Object.entries(additional)) {
      if (!PROTECTED_ENV_VARS.has(key.toUpperCase())) {
        filtered[key] = value
      }
    }
  }
  return filtered
}
export { SAFE_ENV_VARS }

