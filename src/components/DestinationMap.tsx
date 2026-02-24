import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Destination } from "@/types/schema";

// Dynamically import Leaflet components to avoid SSR issues
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

export const DestinationMap: React.FC<DestinationMapProps> = (props) => {
  return <MapComponent {...props} />;
};
