import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Destination } from "@/types/schema";

// CRITICAL: Must use dynamic import with ssr: false because Leaflet uses window object
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-600">Loading map...</p>
    </div>
  ),
});

interface DestinationMapProps {
  destinations: Destination[];
  onDestinationClick?: (destination: Destination) => void;
}

// Wrapper to prevent re-renders that cause map remounts
export const DestinationMap: React.FC<DestinationMapProps> = (props) => {
  return <MapComponent {...props} />;
};
