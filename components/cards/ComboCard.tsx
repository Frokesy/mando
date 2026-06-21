import { StarIcon } from "../svgs/DefaultIcons";

type ComboCardProps = {
  title?: string;
  price?: string;
  vendor?: string;
  rating?: string;
  imgUrl?: string;
};

const ComboCard = ({
  title = "Amala + Ewedu soup",
  price = "N2,800",
  vendor = "Mama Chef Cafe",
  rating = "4.5(65k)",
  imgUrl = "/dummy-img.jpg",
}: ComboCardProps) => {
  return (
    <div>
      <div
        className="h-[194px] bg-cover bg-center relative rounded-lg"
        style={{ backgroundImage: `url(${imgUrl})` }}
      >
        <div className="bg-black/50 text-white h-[194px] rounded-lg p-3 flex flex-col justify-between">
          <div className="flex justify-end items-center space-x-1">
            <StarIcon />
            <p className="text-[14px]">{rating}</p>
          </div>

          <div className="flex justify-end">
            <button className="bg-white uppercase border-3 border-[#DFB400] text-[#DFB400] font-semibold py-2 px-6 rounded-lg hover:bg-[#f0f0f0]">
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button className="bg-[#DFB400] text-[#000000] font-semibold py-2 px-4 rounded-lg hover:bg-[#e6d400] shadow-[0_32px_64px_rgba(223,180,0,0.45)] transform transition-all hover:-translate-y-1">
          {price}
        </button>

        <p className="text-[16px] font-semibold mt-2">{title}</p>
        <button className="text-[#4D00FF] my-2 bg-[#4D00FF1A] text-[13px] font-semibold py-1 px-3 rounded-lg">
          {vendor}
        </button>
      </div>
    </div>
  );
};

export default ComboCard;
