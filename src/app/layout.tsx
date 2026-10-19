import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Eboncraft.dev: World of Warcraft addons, straight from GitHub", template: "%s · Eboncraft.dev" },
  description:
    "A developer-first World of Warcraft addon directory. Link your GitHub repo and Eboncraft syncs releases, READMEs and game versions automatically.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh font-sans`}>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 pb-24">{children}</main>
        <footer className="border-t py-8 text-center text-xs text-muted-foreground">
          Eboncraft.dev · GitHub is the source of truth. Not affiliated with Blizzard Entertainment.
        </footer>
      </body>
    </html>
  );
}
