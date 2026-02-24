"use client";

import { useEffect, useState } from "react";

// PantryMap 地图页面的 URL
const PANTRY_MAP_URL = process.env.NEXT_PUBLIC_PANTRY_MAP_URL || "http://localhost:3000";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 给 iframe 一些时间加载
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-80px)]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <iframe
        src={PANTRY_MAP_URL}
        className="w-full h-full border-0"
        title="Pantry Map"
        allow="geolocation"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
