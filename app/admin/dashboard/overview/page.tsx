import StatsCard from "@/components/cards/StatsCard";
import {
  FinancialsIcon,
  OrderIcon,
  RiderIcon,
  VendorsIcon,
} from "@/components/svgs/AdminIcons";

const AdminOverview = () => {
  const overviewStats = [
    {
      id: 1,
      statTitle: "Revenue",
      qty: "₦78,540",
      crease: "+8.4% in the last 7 days",
      theme: "bg-[#F0FDF4]",
      increase: true,
      icon: <FinancialsIcon />,
      iconColor: "text-[#00C950]",
    },
    {
      id: 2,
      statTitle: "Orders",
      qty: "5,245",
      crease: "+12.6% in the last 7 days",
      theme: "bg-[#FFFBEB]",
      increase: true,
      icon: <OrderIcon />,
      iconColor: "text-[#FE9A00]",
    },
    {
      id: 3,
      statTitle: "Active Riders",
      qty: "542",
      crease: "+1.8% in the last 7 days",
      theme: "bg-[#EFF6FF]",
      increase: true,
      icon: <RiderIcon />,
      iconColor: "text-[#2B7FFF]",
    },
    {
      id: 4,
      statTitle: "Active Vendors",
      qty: "1,248",
      crease: "+0.7% in the last 7 days",
      theme: "bg-[#FAF5FF]",
      increase: true,
      icon: <VendorsIcon />,
      iconColor: "text-[#AD46FF]",
    },
    {
      id: 5,
      statTitle: "Cancel Rate",
      qty: "4.6%",
      crease: "-2.1% in the last 7 days",
      theme: "bg-[#FEF2F2]",
      increase: false,
      icon: <VendorsIcon />,
      iconColor: "text-[#FF6467]",
    },
  ];
  return (
    <div className="">
      <h2 className="text-[#101828] text-[18px] font-semibold">Overview</h2>
      <p className="text-[#99A1AF] text-[11px]">
        Here's what's happening with your platform today.
      </p>

      <div className="grid grid-cols-5 gap-3 mt-10 pr-8">
        {overviewStats.map((item) => (
          <div key={item.id}>
            <StatsCard
              statTitle={item.statTitle}
              qty={item.qty}
              crease={item.crease}
              iconColor={item.iconColor}
              theme={item.theme}
              increase={item.increase}
              icon={item.icon}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
