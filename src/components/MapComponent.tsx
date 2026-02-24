import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Destination } from "@/types/schema";

const statusColors: Record<string, string> = {
  proposed: "#6366f1", // indigo
  accepted: "#f59e0b", // amber
  planned: "#3b82f6", // blue
  visited: "#10b981", // emerald
};

const createMarkerIcon = (status: string) => {
  const color = statusColors[status as keyof typeof statusColors] || "#6366f1";
  const svgIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="3"/>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    iconSize: [32, 32],
    popupAnchor: [0, -16],
    className: "custom-marker",
  });
};

interface MapComponentProps {
  destinations: Destination[];
  onDestinationClick?: (destination: Destination) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  destinations,
  onDestinationClick,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter destinations with coordinates
  const validDestinations = destinations.filter((d) => d.latitude && d.longitude);

  if (!isMounted) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  if (validDestinations.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-600">No destinations with location data to display on map</p>
      </div>
    );
  }

  // Calculate bounds
  const bounds = validDestinations.reduce(
    (acc, dest) => {
      if (!dest.latitude || !dest.longitude) return acc;
      return {
        minLat: Math.min(acc.minLat, dest.latitude),
        maxLat: Math.max(acc.maxLat, dest.latitude),
        minLng: Math.min(acc.minLng, dest.longitude),
        maxLng: Math.max(acc.maxLng, dest.longitude),
      };
    },
    { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
  );

  const center: [number, number] = [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLng + bounds.maxLng) / 2,
  ];

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      <MapContainer center={center} zoom={4} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validDestinations.map((dest) => (
          <Marker
            key={dest.id}
            position={[dest.latitude!, dest.longitude!]}
            icon={createMarkerIcon(dest.status)}
            eventHandlers={{
              click: () => onDestinationClick?.(dest),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                {dest.mainPhotoUrl && (
                  <img
                    src={dest.mainPhotoUrl}
                    alt={dest.name}
                    className="w-full h-24 object-cover rounded mb-2"
                  />
                )}
                <h3 className="font-bold text-sm">{dest.name}</h3>
                <p className="text-xs text-gray-600">
                  {dest.place}, {dest.country}
                </p>
                <p className="text-xs mt-1">
                  <span
                    className="inline-block px-2 py-1 rounded text-white text-xs font-semibold"
                    style={{ backgroundColor: statusColors[dest.status] }}
                  >
                    {dest.status}
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
