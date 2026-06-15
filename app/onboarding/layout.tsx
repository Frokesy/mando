import React from "react";

const OnboardingLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="">
      <div>{children}</div>
    </div>
  );
};

export default OnboardingLayout;
