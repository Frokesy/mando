import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-sales-agent.webmanifest",
  appleWebApp: { capable: true, title: "Mando Agent", statusBarStyle: "default" },
};

export default function SalesAgentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
