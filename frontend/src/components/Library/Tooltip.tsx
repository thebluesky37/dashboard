import React, { useState } from "react";

interface TooltipProps {
  children: React.ReactNode;
  hoverText?: string;
  clickText?: string;
  unstyledTrigger?: boolean;
}

const CustomTooltip: React.FC<TooltipProps> = ({
  children,
  hoverText,
  clickText,
  unstyledTrigger = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipText, setTooltipText] = useState(hoverText);

  const handleButtonClick = () => {
    if (clickText) {
      setShowTooltip(true);
      setTooltipText(clickText);
      setTimeout(() => {
        setShowTooltip(false);
        setTooltipText(hoverText); // reset the tooltip text
      }, 2000);
    }
  };

  const handleHover = () => {
    if (hoverText) {
      setShowTooltip(true);
      setTooltipText(hoverText);
    }
  };

  const handleNoHover = () => {
    if (hoverText) {
      setShowTooltip(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={handleButtonClick}
        onMouseEnter={handleHover}
        onMouseLeave={handleNoHover}
        style={{ position: "relative", display: "inline-block" }}
      >
        {showTooltip && (
          <span className="absolute bottom-full mb-2.5 flex justify-center transition ease-in duration-100 opacity-100">
            <span className="rounded-md border border-gray-200 bg-white px-3 py-1 text-[0.625rem] font-semibold uppercase leading-4 tracking-wide text-gray-700 shadow-sm">
              <svg
                aria-hidden="true"
                width="16"
                height="6"
                viewBox="0 0 16 6"
                className="absolute left-1/2 top-full -ml-4 -mt-px text-white"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15 0H1V1.00366V1.00366V1.00371H1.01672C2.72058 1.0147 4.24225 2.74704 5.42685 4.72928C6.42941 6.40691 9.57154 6.4069 10.5741 4.72926C11.7587 2.74703 13.2803 1.0147 14.9841 1.00371H15V0Z"
                  fill="currentColor"
                ></path>
              </svg>
              {tooltipText}
            </span>
          </span>
        )}
        <div
          className={
            unstyledTrigger
              ? "group inline-flex"
              : "group inline-flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm transition-all duration-150 ease-in-out hover:bg-gray-100"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export { CustomTooltip };
