import { Footer, Layout, Navbar } from "nextra-theme-docs"
import { Banner, Head } from "nextra/components"
import { getPageMap } from "nextra/page-map"
import "nextra-theme-docs/style.css"
import "./global.css"

export const metadata = {
  title: "Perstack",
  description: "Perstack is a platform for building and running AI agents.",
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
