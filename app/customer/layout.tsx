import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-customer.webmanifest",
  appleWebApp: { capable: true, title: "Mando Food", statusBarStyle: "default" },
};

export default function CustomerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
