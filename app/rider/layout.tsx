import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-rider.webmanifest",
  appleWebApp: { capable: true, title: "Mando Rider", statusBarStyle: "default" },
};

export default function RiderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
