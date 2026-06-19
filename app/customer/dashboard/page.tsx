import { LocationIcon, NotificationIcon } from "@/components/svgs/DefaultIcons";

const Dashboard = () => {
    return (
        <div className="p-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="w-[43px] h-[47px] flex items-center justify-center bg-[#F7F7F7] rounded-md">
                        <LocationIcon />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[14px] text-[#A4A4A4]">Delivery to</p>
                        <h2 className="text-[16px] font-semibold">123 Ajose Adeogun Street...</h2>
                    </div>
                </div>

                <div className="bg-[#FFDB431A] w-[49px] h-[49px] rounded-full flex items-center justify-center">
                    <NotificationIcon />
                </div>
            </div>
        </div>
    )
}

export default Dashboard;