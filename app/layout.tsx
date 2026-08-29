import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import RootContainer from "./RootContainer";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import SalesAttributionCapture from "@/components/SalesAttributionCapture";
import ToastContainer from "@/components/ToastContainer";
import PushFeatureAnnouncement from "@/components/PushFeatureAnnouncement";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mando.ng"),
  title: {
    default: "Mando",
    template: "%s | Mando",
  },
  description:
    "Mando connects customers to curated food combos, trusted restaurants, riders, and sales agents for fast campus and neighborhood food delivery.",
  applicationName: "Mando",
  generator: "Mando",
  keywords: [
    "Mando",
    "food delivery",
    "food combos",
    "restaurant delivery",
    "campus food delivery",
    "rider delivery",
  ],
  authors: [{ name: "Mando" }],
  creator: "Mando",
  publisher: "Mando",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Mando",
    title: "Mando",
    description:
      "Order curated food combos from restaurants near you and track every delivery from checkout to doorstep.",
    url: "/",
    images: [
      {
        url: "/ad.png",
        width: 1200,
        height: 630,
        alt: "Mando food delivery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mando",
    description:
      "Curated food combos, restaurant ordering, rider delivery, and tracked checkout in one Mando experience.",
    images: ["/ad.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Mando",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-screen flex flex-col items-center justify-start">
        <RootContainer>
          {children}
        </RootContainer>
        <ToastContainer />
        <Suspense fallback={null}>
          <SalesAttributionCapture />
        </Suspense>
        <ServiceWorkerRegister />
        <PushFeatureAnnouncement />
      </body>
    </html>
  );
}
