import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  manifest: "/manifest-admin.webmanifest",
  appleWebApp: { capable: true, title: "Mando Admin", statusBarStyle: "default" },
};

const AdminLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="fixed inset-0 overflow-auto bg-slate-50">
      <div className="mx-auto w-full max-w-[1400px] min-h-screen">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
