import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { site } from "@/content/site";

const ui = Geist({ variable: "--font-ui", subsets: ["latin", "latin-ext"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], display: "swap" });

export const metadata: Metadata = {
  title: { default: site.title, template: `%s · ${site.short}` },
  description: site.description,
  openGraph: { title: site.title, description: site.description, locale: "fr_DZ", type: "website" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#050703" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${ui.variable} ${playfair.variable} h-full`}>
      <body className="flex min-h-full flex-col text-[15px] xl:text-[16px]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
