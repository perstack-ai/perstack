---
"@perstack/docker": patch
---

Normalize trailing dots in domain allowlist to prevent potential bypass

DNS treats `example.com` and `example.com.` as equivalent (FQDN notation), but Squid proxy might not handle them consistently. This change normalizes domains by removing trailing dots before generating the allowlist, ensuring consistent security policy enforcement.
