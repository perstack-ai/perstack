/**
 * Check if a hostname is a private or local IP address.
 * Used to validate SSE endpoints - private/local IPs are not allowed.
 */
export function isPrivateOrLocalIP(hostname: string): boolean {
  // Check common local hostnames
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    return true
  }

  // Check IPv4 private ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    // 10.0.0.0/8
    if (a === 10) return true
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true
  }

  // Check IPv6 private ranges
  if (hostname.includes(":")) {
    // fe80::/10 (link-local)
    if (hostname.startsWith("fe80:")) return true
    // fc00::/7 (unique local)
    if (hostname.startsWith("fc") || hostname.startsWith("fd")) return true
  }

  // Check IPv4-mapped IPv6 addresses
  if (hostname.startsWith("::ffff:")) {
    const ipv4Part = hostname.slice(7)
    if (isPrivateOrLocalIP(ipv4Part)) {
      return true
    }
  }

  return false
}
