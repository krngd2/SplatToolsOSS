import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://splat.tools";

export const metadata: Metadata = {
  title: {
    default: "SplatTools - Image Preprocessing for 3D Gaussian Splatting",
    template: "%s | SplatTools",
  },
  description:
    "Extract sharp frames, generate masks, and preprocess your images with specialized tools designed for photorealistic 3D reconstruction and Gaussian Splatting.",
  keywords: [
    "3D Gaussian Splatting",
    "photogrammetry",
    "frame extraction",
    "mask generation",
    "3D reconstruction",
    "NeRF",
    "video processing",
    "HDR images",
    "blur detection",
  ],
  authors: [{ name: "SplatTools" }],
  creator: "SplatTools",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "SplatTools",
    title: "SplatTools - Image Preprocessing for 3D Gaussian Splatting",
    description:
      "Extract sharp frames, generate masks, and preprocess your images with specialized tools designed for photorealistic 3D reconstruction.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SplatTools - 3D Gaussian Splatting Preprocessing Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SplatTools - Image Preprocessing for 3D Gaussian Splatting",
    description:
      "Extract sharp frames, generate masks, and preprocess your images for photorealistic 3D reconstruction.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-950`}
      >
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
