import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-restaurant.webmanifest",
  appleWebApp: { capable: true, title: "Mando Restaurant", statusBarStyle: "default" },
};

export default function RestaurantLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
