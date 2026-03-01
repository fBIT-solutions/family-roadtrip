import React, { useEffect, useRef } from "react";
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

// Use Leaflet directly - bypasses react-leaflet's MapContainer which has React strict mode issues
const MapComponent: React.FC<MapComponentProps> = ({
  destinations,
  onDestinationClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter destinations with coordinates
    const validDestinations = destinations.filter((d) => d.latitude && d.longitude);

    if (validDestinations.length === 0) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // Calculate center
    const center: [number, number] = [
      validDestinations.reduce((sum, d) => sum + d.latitude!, 0) / validDestinations.length,
      validDestinations.reduce((sum, d) => sum + d.longitude!, 0) / validDestinations.length,
    ];

    // Check if map already exists - if so, just update markers
    if (mapRef.current) {
      // Clear previous markers
      markersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
      markersRef.current = [];

      // Add new markers
      validDestinations.forEach((dest) => {
        const marker = L.marker([dest.latitude!, dest.longitude!], {
          icon: createMarkerIcon(dest.status),
        }).bindPopup(
          `<div class="min-w-[200px]">
            ${dest.mainPhotoUrl ? `<img src="${dest.mainPhotoUrl}" alt="${dest.name}" class="w-full h-24 object-cover rounded mb-2" />` : ''}
            <h3 class="font-bold text-sm">${dest.name}</h3>
            <p class="text-xs text-gray-600">${dest.place}, ${dest.country}</p>
            <p class="text-xs mt-1"><span class="inline-block px-2 py-1 rounded text-white text-xs font-semibold" style="background-color: ${statusColors[dest.status]}">${dest.status}</span></p>
          </div>`
        );
        marker.on('click', () => onDestinationClick?.(dest));
        marker.addTo(mapRef.current!);
        markersRef.current.push(marker);
      });

      // Fit bounds
      const bounds = L.latLngBounds(validDestinations.map((d) => [d.latitude!, d.longitude!]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      return;
    }

    // Create new map instance only once
    mapRef.current = L.map(containerRef.current).setView(center, 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    // Add markers
    validDestinations.forEach((dest) => {
      const marker = L.marker([dest.latitude!, dest.longitude!], {
        icon: createMarkerIcon(dest.status),
      }).bindPopup(
        `<div class="min-w-[200px]">
          ${dest.mainPhotoUrl ? `<img src="${dest.mainPhotoUrl}" alt="${dest.name}" class="w-full h-24 object-cover rounded mb-2" />` : ''}
          <h3 class="font-bold text-sm">${dest.name}</h3>
          <p class="text-xs text-gray-600">${dest.place}, ${dest.country}</p>
          <p class="text-xs mt-1"><span class="inline-block px-2 py-1 rounded text-white text-xs font-semibold" style="background-color: ${statusColors[dest.status]}">${dest.status}</span></p>
        </div>`
      );
      marker.on('click', () => onDestinationClick?.(dest));
      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds
    const bounds = L.latLngBounds(validDestinations.map((d) => [d.latitude!, d.longitude!]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [destinations, onDestinationClick]);

  // Filter destinations with coordinates
  const validDestinations = destinations.filter((d) => d.latitude && d.longitude);

  if (validDestinations.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-600">No destinations with location data to display on map</p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-96 rounded-lg overflow-hidden" />;
};

export default MapComponent;
