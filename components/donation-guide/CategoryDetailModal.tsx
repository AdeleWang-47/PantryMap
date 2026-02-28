"use client";

import { SubCategory } from "@/components/donation-guide/types/foods";
import { X } from "lucide-react";
import { DonationIcon } from "@/components/donation-guide/icons";
import Modal from "./Modal";
import {
  getCheckWithSiteConsiderationBullets,
  isCheckWithSiteCategory,
} from "@/components/donation-guide/checkWithSiteConsiderations";

interface CategoryDetailModalProps {
  subcategory: SubCategory | null;
  categoryId?: string | null;
  categoryColor: "green" | "yellow" | "red";
  showCheckWithSiteDisclaimer?: boolean;
  onClose: () => void;
}

export default function CategoryDetailModal({
  subcategory,
  categoryId,
  categoryColor,
  showCheckWithSiteDisclaimer = false,
  onClose,
}: CategoryDetailModalProps) {
  if (!subcategory) return null;

  const colorClasses = {
    green: "border-green-500 text-green-800",
    yellow: "border-yellow-500 text-yellow-800",
    red: "border-red-500 text-red-800",
  };


  const storageLabels: { [key: string]: string } = {
    pantry: "Pantry",
    fridge: "Refrigerator",
    freezer: "Freezer",
    none: "N/A",
  };

  const displayStorage =
    (subcategory as SubCategory & { storageRequirement?: string }).storageRequirement ??
    storageLabels[subcategory.storage] ??
    "N/A";
  const isCheckWithSiteItem =
    showCheckWithSiteDisclaimer && isCheckWithSiteCategory(categoryId || undefined);
  const checkWithSiteBullets = getCheckWithSiteConsiderationBullets({
    considerations: subcategory.considerations,
    subcategoryId: subcategory.id,
    subcategoryTitle: subcategory.title,
  });

  return (
    <Modal
      isOpen={Boolean(subcategory)}
      onClose={onClose}
      contentClassName={`border-2 ${colorClasses[categoryColor]}`}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <DonationIcon iconKey={subcategory.icon} className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">{subcategory.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Examples */}
        {subcategory.examples.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Examples:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {subcategory.examples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Considerations */}
        {subcategory.considerations && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Considerations:</h3>
            {isCheckWithSiteItem ? (
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {checkWithSiteBullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              (() => {
                const text = subcategory.considerations;
                const noteIndex = text.indexOf("Note:");
                if (noteIndex === -1) {
                  const single = text.trim();
                  return <p className="text-gray-700">{single}</p>;
                }
                const main = text.slice(0, noteIndex).trim().replace(/\.$/, "");
                const note = text.slice(noteIndex).trim();
                const lines = [main, note].filter(Boolean);
                return (
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {lines.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                );
              })()
            )}
          </div>
        )}

        {/* Storage */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">
            Storage Requirement:
          </h3>
          <p className="text-gray-700">{displayStorage}</p>
        </div>
      </div>
    </Modal>
  );
}
