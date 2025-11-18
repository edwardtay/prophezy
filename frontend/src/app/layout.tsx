import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });
const caveat = Caveat({ 
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prophezy - Predict. Trade. Win.",
  description: "Predict. Trade. Win. • Fast Oracles • Gasless UX",
  manifest: "/manifest.json",
  themeColor: "#FF6600",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Force HTTPS redirect before any scripts load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.protocol === 'http:' && window.location.hostname === 'localhost') {
                window.location.replace(window.location.href.replace('http:', 'https:'));
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${caveat.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

