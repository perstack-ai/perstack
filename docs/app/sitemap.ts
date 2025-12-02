import type { MetadataRoute } from "next"
const baseUrl = "https://docs.perstack.ai"
const pages = [
  "",
  "/getting-started",
  "/understanding-perstack/concept",
  "/understanding-perstack/experts",
  "/understanding-perstack/runtime",
  "/understanding-perstack/registry",
  "/understanding-perstack/sandbox-integration",
  "/making-experts",
  "/making-experts/skills",
  "/making-experts/base-skill",
  "/making-experts/testing",
  "/making-experts/publishing",
  "/making-experts/best-practices",
  "/making-experts/examples",
  "/using-experts",
  "/using-experts/running-experts",
  "/using-experts/workspace",
  "/using-experts/state-management",
  "/using-experts/error-handling",
  "/operating-experts/deployment",
  "/operating-experts/isolation-by-design",
  "/operating-experts/observing",
  "/references/cli",
  "/references/perstack-toml",
  "/references/providers-and-models",
  "/references/registry-api",
  "/contributing/roadmap",
]
export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((page) => ({
    url: `${baseUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: page === "" ? 1 : 0.8,
  }))
}
