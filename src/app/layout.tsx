import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { VerifyBanner } from "@/components/VerifyBanner";
import { Footer } from "@/components/Footer";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  // Optical sizing is what makes the serif feel set, not typed, at 64px.
  axes: ["opsz"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Leaflet",
  description: "Every book you read, remembered.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${newsreader.variable} flex min-h-svh flex-col antialiased`}
      >
        <Nav />
        <VerifyBanner />
        {/* Bare main: pages own their containers, so the landing page can
            run full-bleed alternating sections while app pages use the
            1080px content column. */}
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
