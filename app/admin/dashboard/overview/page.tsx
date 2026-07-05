import StatsCard from "@/components/cards/StatsCard";
import {
  DisputeIcon,
  FinancialsIcon,
  OrderIcon,
  RiderIcon,
  VendorsIcon,
} from "@/components/svgs/AdminIcons";
import { BlueDot, GreenDot, OrangeDot, RedDot } from "@/components/svgs/Dots";
import { FaStar } from "react-icons/fa";

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

  const quickStats = [
    { id: 1, dot: <OrangeDot />, title: "Total Orders", value: "5,245" },
    { id: 2, dot: <GreenDot />, title: "Total Deliveries", value: "3,652" },
    { id: 3, dot: <BlueDot />, title: "Total Revenue", value: "₦78,540" },
    { id: 4, dot: <RedDot />, title: "Payment Issues", value: "14" },
  ];

  const systemStatus = [
    { id: 1, title: "Order Processing", status: "Online", isBad: false },
    { id: 1, title: "Restaurants Online", status: "5 online", isBad: false },
    { id: 1, title: "Riders Available", status: "2 online", isBad: false },
    { id: 1, title: "Payment Gateway", status: "Degraded", isBad: true },
  ];

  const pendingActions = [
    {
      id: 1,
      title: "Vendor Approvals",
      icon: <VendorsIcon />,
      iconColor: "text-[#FF6900]",
      qty: 3,
    },
    {
      id: 2,
      title: "Sales Agent Approvals",
      icon: <OrderIcon />,
      iconColor: "text-[#2B7FFF]",
      qty: 7,
    },
    {
      id: 3,
      title: "Dispute Resolution",
      icon: <DisputeIcon />,
      iconColor: "text-[#FB2C36]",
      qty: 2,
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

      <div className="grid grid-cols-3 gap-6 mt-10 pr-8">
        <div className="bg-[#ffffff] p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-[13px] font-semibold">Quick Stats</h2>
            <GreenDot />
          </div>

          <div className="mt-6 space-y-3">
            {quickStats.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="">{item.dot}</div>
                  <p className="text-[10px] text-[#4A5565]">{item.title}</p>
                </div>
                <p className="text-[10px] text-[#101828]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#ffffff] p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-[#101828] text-[12px] font-semibold">
              Orders Overview
            </h2>
            <p className="text-[#101828] text-[11px]">This week</p>
            <p className="text-[#101828] text-[11px]">Last Week</p>
            {/* dropdown filter */}
            <div className="border border-[#cccccc] p-2 rounded-md text-[10px] text-[#808080]">
              7 days
            </div>
          </div>

          <img src="/dummy-graph.png" alt="dummy-graph" />
        </div>

        <div className="space-y-4">
          <div className="space-y-3 bg-[#ffffff] p-3 rounded-lg">
            <h2 className="text-[12px] font-semibold">System Status</h2>
            {systemStatus.map((item) => (
              <div className="flex justify-between items-center" key={item.id}>
                <p className="text-[10px] text-[#4A5565]">{item.title}</p>
                <p
                  className={`text-[10px] font-semibold ${item.isBad ? "text-[#EF4444] bg-[#FFE2E2] p-2 rounded-lg" : "text-[#10B981] bg-[#DCFCE7] p-2 rounded-lg"}`}
                >
                  {item.status}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3 bg-[#ffffff] p-3 rounded-lg">
            <div className="flex justify-between">
              <h2 className="text-[12px] font-semibold">Pending Actions</h2>
              <button className="text-[#FE9A00] text-[11px]">View All</button>
            </div>
            {pendingActions.map((item) => (
              <div className="flex justify-between items-center" key={item.id}>
                <div className="flex items-center space-x-3">
                  <div className={`${item.iconColor}`}>{item.icon}</div>
                  <p className="text-[10px] text-[#4A5565]">{item.title}</p>
                </div>

                <button className="">{item.qty}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-10 pr-8">
        <div className="space-y-3 bg-[#ffffff] p-3 rounded-lg">
          <div className="flex justify-between">
            <h2 className="text-[12px] font-semibold">Recent Orders</h2>
            <button className="text-[#FE9A00] text-[11px]">View All</button>
          </div>

          <div className="bg-gray-100 grid grid-cols-4 gap-6 p-2 text-[10px] text-[#99A1AF]">
            <p className="">Order ID</p>
            <p className="">Customer</p>
            <p className="">Restaurant</p>
            <p className="">Amount</p>
          </div>
          <div className="grid grid-cols-4 gap-6 py-1 px-2 text-[10px] text-[#99A1AF]">
            <p className="">#12345</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                JD
              </div>
              <p className="">John Doe</p>
            </div>
            <p className="">Pizza Place</p>
            <p className="">₦5,000</p>
          </div>
          <div className="grid grid-cols-4 gap-6 py-1 px-2 text-[10px] text-[#99A1AF]">
            <p className="">#12346</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                JS
              </div>
              <p className="">Jane Smith</p>
            </div>
            <p className="">Burger Joint</p>
            <p className="">₦3,500</p>
          </div>
          <div className="grid grid-cols-4 py-1 px-2 gap-6 text-[10px] text-[#99A1AF]">
            <p className="">#12347</p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                MJ
              </div>
              <p className="">Mike Johnson</p>
            </div>
            <p className="">Sushi Bar</p>
            <p className="">₦7,200</p>
          </div>
        </div>

        <div className="space-y-3 bg-[#ffffff] p-3 rounded-lg">
          <div className="flex justify-between">
            <h2 className="text-[12px] font-semibold">Top Vendors</h2>
            <button className="text-[#FE9A00] text-[11px]">View All</button>
          </div>

          <div className="bg-gray-100 grid grid-cols-4 gap-6 p-2 text-[10px] text-[#99A1AF]">
            <p className="">Vendor</p>
            <p className="">Orders</p>
            <p className="">Revenue</p>
            <p className="">Rating</p>
          </div>
          <div className="grid grid-cols-4 gap-6 py-1 px-2 text-[10px] text-[#99A1AF]">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                JD
              </div>
              <p className="">John Doe</p>
            </div>
            <p className="">Pizza Place</p>
            <p className="">₦5,000</p>
            <div className="flex items-center space-x-1 text-[#FE9A00]">
              <p className="">4.7</p>
              <FaStar />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 py-1 px-2 text-[10px] text-[#99A1AF]">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                JS
              </div>
              <p className="">Jane Smith</p>
            </div>
            <p className="">Burger Joint</p>
            <p className="">₦3,500</p>
            <div className="flex items-center space-x-1 text-[#FE9A00]">
              <p className="">4.5</p>
              <FaStar />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 py-1 px-2 text-[10px] text-[#99A1AF]">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                JS
              </div>
              <p className="">Jane Smith</p>
            </div>
            <p className="">Burger Joint</p>
            <p className="">₦3,500</p>
            <div className="flex items-center space-x-1 text-[#FE9A00]">
              <p className="">4.5</p>
              <FaStar />
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-[#ffffff] p-3 rounded-lg">
          <div className="flex justify-between">
            <h2 className="text-[12px] font-semibold">Commonly Disputed</h2>
            <button className="text-[#FE9A00] text-[11px]">View All</button>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                JS
              </div>
              <div className="text-[10px] space-y-1">
                <h2>John Snow</h2>
                <p className="text-[#6A7282]">DD-1022 - N3,400</p>
                <p className="text-[#FB2C36]">Wrong item delivered</p>
              </div>
            </div>

            <button className="text-[10px] text-[#99A1AF]">2h ago</button>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-[#DFB400] flex items-center justify-center text-white text-[10px]">
                JS
              </div>
              <div className="text-[10px] space-y-1">
                <h2>John Snow</h2>
                <p className="text-[#6A7282]">DD-1022 - N3,400</p>
                <p className="text-[#FB2C36]">Wrong item delivered</p>
              </div>
            </div>

            <button className="text-[10px] text-[#99A1AF]">2h ago</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
