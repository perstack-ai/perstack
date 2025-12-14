---
"perstack": minor
"@perstack/runtime": minor
---

Support GitHub URL for --config option

Allow --config option to accept GitHub raw URLs (https://raw.githubusercontent.com/...) in addition to local file paths. Security considerations:
- Only raw.githubusercontent.com domain is allowed
- HTTPS only (HTTP URLs are rejected)
- Redirects are disabled to prevent SSRF attacks
