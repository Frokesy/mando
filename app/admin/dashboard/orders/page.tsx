"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/cards/StatsCard";
import {
  CancelIcon,
  DeliveredIcon,
  InProgressIcon,
  OrderIcon,
  PendingIcon,
} from "@/components/svgs/AdminIcons";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  placedAt: string;
  customer: { name: string; phone: string | null };
  restaurant: { name: string };
  rider: { name: string; phone: string | null } | null;
  delivery: { streetAddress: string; serviceArea: string; status: string };
  payment: { method: string | null; status: string };
  items?: {
    id: string;
    name: string;
    quantity: number;
    lineTotalAmount: number;
    components: { itemName: string; quantity: number }[];
  }[];
};

type OrdersResponse = {
  stats: {
    totalOrders: number;
    pending: number;
    inProgress: number;
    delivered: number;
    cancelled: number;
  };
  orders: AdminOrder[];
};

const AdminOrdersPage = () => {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/admin/orders`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load orders");
        return response.json() as Promise<OrdersResponse>;
      })
      .then((result) => {
        if (mounted) setData(result);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function openOrder(order: AdminOrder) {
    setSelectedOrder(order);

    const response = await fetch(`${API_BASE_URL}/admin/orders/${order.id}`, {
      credentials: "include",
    });

    if (!response.ok) return;

    const detail = (await response.json()) as { order: AdminOrder };
    setSelectedOrder(detail.order);
  }

  const overviewStats = [
    {
      id: 1,
      statTitle: "Total Orders",
      qty: String(data?.stats.totalOrders ?? 0),
      crease: "All orders",
      theme: "bg-[#FFFBEB]",
      increase: true,
      icon: <OrderIcon />,
      iconColor: "text-[#FE9A00]",
    },
    {
      id: 2,
      statTitle: "Pending",
      qty: String(data?.stats.pending ?? 0),
      crease: "Awaiting action",
      theme: "bg-[#F0FDF4]",
      increase: true,
      icon: <PendingIcon />,
      iconColor: "text-[#00C950]",
    },
    {
      id: 3,
      statTitle: "In Progress",
      qty: String(data?.stats.inProgress ?? 0),
      crease: "Preparing or delivery",
      theme: "bg-[#EFF6FF]",
      increase: true,
      icon: <InProgressIcon />,
      iconColor: "text-[#2B7FFF]",
    },
    {
      id: 4,
      statTitle: "Delivered",
      qty: String(data?.stats.delivered ?? 0),
      crease: "Completed orders",
      theme: "bg-[#FAF5FF]",
      increase: true,
      icon: <DeliveredIcon />,
      iconColor: "text-[#AD46FF]",
    },
    {
      id: 5,
      statTitle: "Cancelled",
      qty: String(data?.stats.cancelled ?? 0),
      crease: "Stopped orders",
      theme: "bg-[#FEF2F2]",
      increase: false,
      icon: <CancelIcon />,
      iconColor: "text-[#FF6467]",
    },
  ];

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[#101828]">Orders</h2>
      <p className="text-[11px] text-[#99A1AF]">
        {loading ? "Loading orders..." : "Manage and track all customer orders in real time."}
      </p>

      <div className="mt-10 grid grid-cols-5 gap-3 pr-8">
        {overviewStats.map((item) => (
          <StatsCard key={item.id} {...item} />
        ))}
      </div>

      <div className={`mt-10 grid gap-5 pr-8 ${selectedOrder ? "grid-cols-[1fr_320px]" : "grid-cols-1"}`}>
        <div className="space-y-3 rounded-lg bg-white p-3">
          <div className="grid grid-cols-9 gap-6 bg-gray-100 p-2 text-[10px] text-[#99A1AF]">
            <p>Order ID</p>
            <p>Customer</p>
            <p>Restaurant</p>
            <p>Rider</p>
            <p>Amount</p>
            <p>Payment</p>
            <p>Status</p>
            <p>Time & Date</p>
            <p>Action</p>
          </div>

          {(data?.orders ?? []).map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => void openOrder(order)}
              className={`grid w-full grid-cols-9 items-center gap-6 px-2 py-2 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${
                selectedOrder?.id === order.id ? "bg-[#FFF7E0]" : ""
              }`}
            >
              <p>{order.orderNumber}</p>
              <PersonCell name={order.customer.name} detail={order.customer.phone} color="bg-[#C27AFF]" />
              <PersonCell name={order.restaurant.name} color="bg-[#DFB400]" />
              <PersonCell name={order.rider?.name ?? "Unassigned"} detail={order.rider?.phone ?? null} color="bg-[#51A2FF]" />
              <p>{formatCurrency(order.totalAmount)}</p>
              <StatusPill label={order.payment.status} />
              <StatusPill label={order.status} />
              <p>{formatDateTime(order.placedAt)}</p>
              <p>View</p>
            </button>
          ))}
        </div>

        {selectedOrder ? (
          <aside className="sticky top-24 h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#99A1AF]">Order</p>
                <h2 className="text-sm font-semibold text-[#101828]">{selectedOrder.orderNumber}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-[#6A7282]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-[11px] text-[#4A5565]">
              <InfoRow label="Customer" value={selectedOrder.customer.name} />
              <InfoRow label="Phone" value={selectedOrder.customer.phone ?? "No phone"} />
              <InfoRow label="Restaurant" value={selectedOrder.restaurant.name} />
              <InfoRow label="Rider" value={selectedOrder.rider?.name ?? "Unassigned"} />
              <InfoRow label="Delivery" value={`${selectedOrder.delivery.streetAddress}, ${selectedOrder.delivery.serviceArea}`} />
              <InfoRow label="Payment" value={selectedOrder.payment.status.replace("_", " ")} />
              <InfoRow label="Status" value={selectedOrder.status.replaceAll("_", " ")} />
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <h3 className="text-xs font-semibold text-[#101828]">Items</h3>
              <div className="mt-3 space-y-3">
                {(selectedOrder.items ?? []).length === 0 ? (
                  <p className="text-[10px] text-[#99A1AF]">Select row loaded. Fetching item detail...</p>
                ) : (
                  selectedOrder.items?.map((item) => (
                    <div key={item.id} className="rounded-lg bg-gray-50 p-3 text-[10px]">
                      <div className="flex justify-between gap-3">
                        <p className="font-semibold text-[#101828]">{item.name}</p>
                        <p>{formatCurrency(item.lineTotalAmount)}</p>
                      </div>
                      <p className="mt-1 text-[#6A7282]">Qty: {item.quantity}</p>
                      {item.components.length ? (
                        <div className="mt-2 space-y-1 text-[#6A7282]">
                          {item.components.map((component) => (
                            <p key={`${item.id}-${component.itemName}`}>
                              {component.itemName} x{component.quantity}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
};

function PersonCell({ name, detail, color }: { name: string; detail?: string | null; color: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-white ${color}`}>
        {initials(name)}
      </div>
      <div className="space-y-1">
        <h2>{name}</h2>
        {detail ? <p className="text-[#6A7282]">{detail}</p> : null}
      </div>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const normalized = label.replaceAll("_", " ");
  const positive = ["verified", "delivered", "paid", "ready for pickup"].includes(normalized);
  return (
    <p className={`rounded-lg p-2 text-center text-[10px] font-semibold capitalize ${
      positive ? "bg-[#DCFCE7] text-[#10B981]" : "bg-[#FFF7E0] text-[#B7791F]"
    }`}>
      {normalized}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-[#99A1AF]">{label}</p>
      <p className="mt-1 font-semibold text-[#101828]">{value}</p>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NA";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export default AdminOrdersPage;
