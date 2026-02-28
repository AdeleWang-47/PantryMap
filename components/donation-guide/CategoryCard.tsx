"use client";

import { useState } from "react";
import { Category } from "@/components/donation-guide/types/foods";
import SubCategoryCard from "./SubCategoryCard";
import CategoryDetailModal from "./CategoryDetailModal";

interface CategoryCardProps {
  category: Category;
  showCheckWithSiteDisclaimer?: boolean;
}

export default function CategoryCard({
  category,
  showCheckWithSiteDisclaimer = false,
}: CategoryCardProps) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<typeof category.subcategories[0] | null>(null);

  const bgColors = {
    green: "bg-green-50",
    yellow: "bg-yellow-50",
    red: "bg-red-50",
  };

  const borderColors = {
    green: "border-green-500",
    yellow: "border-yellow-500",
    red: "border-red-500",
  };

  const titleColors = {
    green: "text-green-800",
    yellow: "text-yellow-800",
    red: "text-red-800",
  };

  return (
    <>
      <div
        className={`${bgColors[category.color]} border-2 ${borderColors[category.color]} rounded-lg p-6`}
      >
        {/* Category Title */}
        <h2 className={`text-2xl font-bold mb-6 text-center ${titleColors[category.color]}`}>
          {category.name}
        </h2>

        {/* Subcategory Grid */}
        <div className="grid grid-cols-2 gap-3">
          {category.subcategories.map((subcategory) => (
            <SubCategoryCard
              key={subcategory.id}
              subcategory={subcategory}
              categoryColor={category.color}
              onClick={() => setSelectedSubcategory(subcategory)}
            />
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <CategoryDetailModal
        subcategory={selectedSubcategory}
        categoryId={category.id}
        categoryColor={category.color}
        showCheckWithSiteDisclaimer={showCheckWithSiteDisclaimer}
        onClose={() => setSelectedSubcategory(null)}
      />
    </>
  );
}
