const AdminDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex justify-between">
      <div className="w-[15%]">sidebar</div>
      <div className="w-[80%]">{children}</div>
    </div>
  );
};

export default AdminDashboardLayout;
