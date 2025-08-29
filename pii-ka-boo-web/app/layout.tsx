import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PII-KA-BOO - Privacy-First AI Chat",
  description:
    "The All-In-One On-Device PII Scrubber for secure AI conversations",
  icons: {
    icon: [
      { url: "/logo_brown.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo_white.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/logo_brown.png",
    apple: "/logo_brown.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
