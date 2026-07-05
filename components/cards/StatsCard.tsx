import React, { JSX } from "react";
import { FinancialsIcon } from "../svgs/AdminIcons";

const StatsCard = ({
  statTitle,
  qty,
  icon,
  iconColor,
  crease,
  theme,
  increase,
}: {
  statTitle: string;
  qty: string;
  icon: JSX.Element;
  iconColor: string;
  crease: string;
  theme: string;
  increase: boolean;
}) => {
  return (
    <div
      className={`min-w-[174px] space-y-3 p-4 rounded-lg ${theme ? theme : "bg-white"}`}
    >
      <div className="flex justify-between">
        <p className="text-[#6A7282] text-[10px]">{statTitle}</p>
        <div className={`${iconColor}`}>
          {icon}
        </div>
      </div>
      <h1 className="text-[18px] font-semibold">{qty}</h1>
      {increase ? (
        <p className="text-[#00A63E] text-[11px]">{crease}</p>
      ) : (
        <p className="text-[#FB2C36] text-[11px]">{crease}</p>
      )}
    </div>
  );
};

export default StatsCard;
