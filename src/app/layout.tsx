import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { themeBootstrapScript } from "@/components/providers/theme-provider";
import { env } from "@/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: env.appName,
    template: `%s • ${env.appName}`,
  },
  description:
    "MeiCrypt Identity Platform — enterprise multi-tenant identity & access management.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/*
          Runs before hydration to apply the persisted theme class to
          <html>, preventing a light/dark flash. next/script with
          beforeInteractive strategy is the Next 16 / React 19-safe way
          to inject inline JS — a bare `<script>` element inside the React
          component tree triggers the "Encountered a script tag while
          rendering React component" warning. See
          src/components/providers/theme-provider.tsx.
        */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
        >
          {themeBootstrapScript}
        </Script>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
