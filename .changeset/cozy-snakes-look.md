---
"@perstack/docker": patch
---

Use official Node.js Docker image as base instead of piping NodeSource setup script to bash

This eliminates the supply chain risk (SEC-001) where a compromised nodesource.com could inject malicious code during container builds. The official `node:22-bookworm-slim` image is protected by Docker's trust chain.
