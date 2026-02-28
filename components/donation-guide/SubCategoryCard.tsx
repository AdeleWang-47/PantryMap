"use client";

import { useState } from "react";
import { SubCategory } from "@/components/donation-guide/types/foods";
import { DonationIcon } from "@/components/donation-guide/icons";

interface SubCategoryCardProps {
  subcategory: SubCategory;
  categoryColor: "green" | "yellow" | "red";
  onClick: () => void;
}

export default function SubCategoryCard({
  subcategory,
  categoryColor,
  onClick,
}: SubCategoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const colorStyles = {
    green: {
      baseBg: "rgb(255 255 255)",
      hoverBg: "rgb(220 252 231)",
      activeBg: "rgb(187 247 208)",
      baseBorder: "rgb(134 239 172)",
      hoverBorder: "rgb(21 128 61)",
      ring: "0 0 0 1px rgb(34 197 94 / 0.35)",
    },
    yellow: {
      baseBg: "rgb(255 255 255)",
      hoverBg: "rgb(254 249 195)",
      activeBg: "rgb(254 240 138)",
      baseBorder: "rgb(253 224 71)",
      hoverBorder: "rgb(161 98 7)",
      ring: "0 0 0 1px rgb(234 179 8 / 0.35)",
    },
    red: {
      baseBg: "rgb(255 255 255)",
      hoverBg: "rgb(254 226 226)",
      activeBg: "rgb(254 202 202)",
      baseBorder: "rgb(252 165 165)",
      hoverBorder: "rgb(185 28 28)",
      ring: "0 0 0 1px rgb(239 68 68 / 0.35)",
    },
  };

  const palette = colorStyles[categoryColor];
  const backgroundColor = isPressed
    ? palette.activeBg
    : isHovered
      ? palette.hoverBg
      : palette.baseBg;
  const borderColor = isHovered || isPressed ? palette.hoverBorder : palette.baseBorder;
  const boxShadow = isHovered || isPressed ? palette.ring : "none";

  // Convert to Title Case for display only
  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onBlur={() => setIsPressed(false)}
      className={`w-full p-4 border-2 rounded-lg cursor-pointer [transition:background-color_150ms_ease,border-color_150ms_ease,color_150ms_ease] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        categoryColor === "green" ? "focus-visible:outline-green-600" :
        categoryColor === "yellow" ? "focus-visible:outline-yellow-600" : "focus-visible:outline-red-600"
      }`}
      style={{ backgroundColor, borderColor, boxShadow }}
    >
      <div className="flex flex-col items-center gap-3">
        <div>
          <DonationIcon iconKey={subcategory.icon} className="w-8 h-8" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm text-center">
          {toTitleCase(subcategory.title)}
        </h3>
      </div>
    </button>
  );
}
