import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { SiteShell } from "@/components/site/SiteShell"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/components/auth/AuthProvider"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mineral Kingdom",
  description: "Minerals, crystals, fixed-price shop, and live auctions.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <SiteShell>{children}</SiteShell>
            <Toaster richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}