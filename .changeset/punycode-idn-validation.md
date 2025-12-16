---
"@perstack/core": patch
---

Reject punycode domains (xn-- labels) in allowedDomains to prevent homograph attacks

Security improvement: Domain pattern validation now detects and rejects internationalized domain names (IDN) encoded as punycode. This prevents potential homograph attacks where malicious domains use similar-looking characters to impersonate legitimate domains.

Reference: SEC-004
