
const Onboarding = () => {
  return (
    <div className="">
      <div className="">
        <img src="/onboarding-imgs/img-one.png" alt="onboarding-img-one" />
      </div>
      <div className="p-6">
        <h2 className="font-bold text-[32px]">
          Tired of the same old struggle with food?
        </h2>
        <p className="text-[20px] text-[#A4A4A4]">
          Waiting long for riders and cold food is exhausting. You deserve
          better.
        </p>

        <div className="grid grid-cols-4 mt-10 gap-6">
          <div className="col-span-1 h-[5px] bg-[#DFB400] rounded-md"></div>
          <div className="col-span-1 h-[5px] bg-[#E8E8E8] rounded-md"></div>
          <div className="col-span-1 h-[5px] bg-[#E8E8E8] rounded-md"></div>
          <div className="col-span-1 h-[5px] bg-[#E8E8E8] rounded-md"></div>
        </div>

        <div className="flex justify-between space-x-6 mt-10">
          <button className="border border-[#E9EAEB] w-[20%] p-4 rounded-lg text-center text-[#A4A4A4]">
            Skip
          </button>
          <button className="bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold w-[80%]">
            Continue
          </button>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;
