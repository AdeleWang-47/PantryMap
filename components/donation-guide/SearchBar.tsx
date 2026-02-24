"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  FoodsData,
  SearchableItem,
  SubCategory,
} from "@/components/donation-guide/types/foods";
import SearchResults from "./SearchResults";
import { X } from "lucide-react";

interface SearchBarProps {
  foodsData: FoodsData;
  onResultClick?: (categoryId: string) => void;
  emphasizeInput?: boolean;
  helperText?: string;
  helperContent?: ReactNode;
}

export default function SearchBar({
  foodsData,
  onResultClick,
  emphasizeInput = false,
  helperText,
  helperContent,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const preserveScroll = () => {
    if (typeof window === "undefined") return;
    const y = window.scrollY;
    requestAnimationFrame(() => {
      if (window.scrollY !== y) {
        window.scrollTo(0, y);
      }
    });
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    return foodsData.searchableItems.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [searchQuery, foodsData.searchableItems]);

  const handleResultSelect = (item: SearchableItem) => {
    setSelectedItem(item);
    setIsClosing(true);
    setSearchQuery(item.name);
    onResultClick?.(item.categoryId);
    setTimeout(() => {
      setIsDropdownOpen(false);
      setIsClosing(false);
      preserveScroll();
    }, 150);
  };

  const handleClear = () => {
    setSelectedItem(null);
    setSearchQuery("");
    setIsDropdownOpen(false);
    setIsClosing(false);
    preserveScroll();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Search happens automatically as user types
  };

  const getCategoryColor = (categoryId: string) => {
    const category = foodsData.categories.find((cat) => cat.id === categoryId);
    return category?.color || "gray";
  };

  const getCategoryName = (categoryId: string) => {
    const category = foodsData.categories.find((cat) => cat.id === categoryId);
    return category?.name || "";
  };

  const getSubcategory = (item: SearchableItem): SubCategory | null => {
    if (!item.parentItem) return null;
    const category = foodsData.categories.find((cat) => cat.id === item.categoryId);
    if (!category) return null;
    return category.subcategories.find((sub) => sub.title === item.parentItem) || null;
  };

  const getFirstConsideration = (considerations: string): string => {
    if (!considerations) return "";
    const firstSentence = considerations.split(/[.!?]+/)[0].trim();
    return firstSentence || considerations;
  };

  const getStorageLabel = (storage: string): string => {
    const storageMap: { [key: string]: string } = {
      pantry: "Pantry",
      fridge: "Refrigerator",
      freezer: "Freezer",
      none: "N/A",
    };
    return storageMap[storage] || "N/A";
  };

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen]);

  const categoryBadgeColors = {
    green: "bg-green-600 text-white",
    yellow: "bg-yellow-600 text-white",
    red: "bg-red-600 text-white",
    gray: "bg-gray-600 text-white",
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedItem(null);
              setIsDropdownOpen(true);
              preserveScroll();
            }}
            onFocus={() => {
              if (searchQuery.trim()) {
                setIsDropdownOpen(true);
              }
            }}
            placeholder="Search for an item (e.g., apple, milk)..."
            className={`w-full px-4 py-3 pr-20 rounded-lg text-lg focus:outline-none ${
              emphasizeInput
                ? "border border-emerald-300 focus:border-2 focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15"
                : "border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
          />
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
            aria-label="Search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </form>
      <div className="mt-3 min-h-[64px]">
        {selectedItem ? (
          <div
            className={`border-2 rounded-lg shadow-sm p-4 ${
              getCategoryColor(selectedItem.categoryId) === "green"
                ? "bg-green-50/40 border-green-200 border-l-4 border-l-green-500"
                : getCategoryColor(selectedItem.categoryId) === "yellow"
                ? "bg-yellow-50/40 border-yellow-200 border-l-4 border-l-yellow-500"
                : getCategoryColor(selectedItem.categoryId) === "red"
                ? "bg-red-50/40 border-red-200 border-l-4 border-l-red-500"
                : "bg-gray-50 border-gray-200 border-l-4 border-l-gray-400"
            }`}
          >
            {(() => {
              const color = getCategoryColor(selectedItem.categoryId);
              const categoryName = getCategoryName(selectedItem.categoryId);
              const subcategory = getSubcategory(selectedItem);
              const firstConsideration = getFirstConsideration(subcategory?.considerations || "");
              const storageLabel = getStorageLabel(subcategory?.storage || "none");
              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900">{selectedItem.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${categoryBadgeColors[color as keyof typeof categoryBadgeColors] || categoryBadgeColors.gray}`}
                    >
                      {categoryName}
                    </span>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {firstConsideration && (
                      <li className="flex items-start gap-2">
                        <span className="text-gray-500 mt-0.5">•</span>
                        <span>
                          <span className="font-semibold">Consideration:</span>{" "}
                          {firstConsideration}
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-0.5">•</span>
                      <span>
                        <span className="font-semibold">Storage Requirement:</span>{" "}
                        {storageLabel}
                      </span>
                    </li>
                  </ul>
                </div>
              );
            })()}
          </div>
        ) : searchQuery.trim() && isDropdownOpen ? (
          <SearchResults
            results={filteredResults}
            foodsData={foodsData}
            onSelect={handleResultSelect}
            isClosing={isClosing}
          />
        ) : (
          <div className="h-full">
            {helperContent ? (
              <div className="mt-2 mb-4">{helperContent}</div>
            ) : helperText ? (
              <p className="mt-2 mb-4 text-sm text-gray-700">{helperText}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
