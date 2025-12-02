import { Footer, Layout, Navbar } from "nextra-theme-docs"
import { Banner, Head } from "nextra/components"
import { getPageMap } from "nextra/page-map"
import "nextra-theme-docs/style.css"
import "./global.css"

export const metadata = {
  metadataBase: new URL("https://docs.perstack.ai"),
  title: {
    default: "Perstack",
    template: "%s | Perstack",
  },
  description: "Perstack is Expert Stack for Agent-first Development. A package manager and runtime for AI agents — npm/npx for agents.",
  keywords: ["ai agents", "mcp", "model context protocol", "agent runtime", "expert system", "typescript", "cli"],
  authors: [{ name: "Perstack" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://docs.perstack.ai",
    siteName: "Perstack",
    title: "Perstack: Expert Stack for Agent-first Development",
    description: "A package manager and runtime for AI agents — npm/npx for agents.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@perstack_ai",
    creator: "@perstack_ai",
    title: "Perstack: Expert Stack for Agent-first Development",
    description: "A package manager and runtime for AI agents — npm/npx for agents.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://docs.perstack.ai",
  },
}

const banner = <Banner storageKey="some-key">Perstack 0.0.1 is released 🎉</Banner>
const navbar = <Navbar logo={<b>Perstack</b>} />
const footer = <Footer>MIT {new Date().getFullYear()} © Perstack.</Footer>

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/perstack-ai/perstack/tree/main/docs"
          footer={footer}
          sidebar={{ autoCollapse: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
