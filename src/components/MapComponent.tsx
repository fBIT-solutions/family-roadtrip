import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Destination, Activity } from "@/types/schema";

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

const createActivityMarkerIcon = (category: string) => {
  // Different colors for different activity categories
  const categoryColors: Record<string, string> = {
    outdoor: "#22c55e",      // green
    cultural: "#8b5cf6",      // violet
    food: "#f97316",          // orange
    nightlife: "#ec4899",     // pink
    shopping: "#0ea5e9",      // sky
    sports: "#ef4444",        // red
    relaxation: "#06b6d4",    // cyan
    adventure: "#f59e0b",     // amber
    other: "#6b7280",         // gray
  };
  
  const color = categoryColors[category as keyof typeof categoryColors] || "#6b7280";
  const svgIcon = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white" opacity="0.5"/>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    iconSize: [24, 24],
    popupAnchor: [0, -12],
    className: "custom-activity-marker",
  });
};

interface MapComponentProps {
  destinations: Destination[];
  activities?: Activity[];
  onDestinationClick?: (destination: Destination) => void;
}

// Use Leaflet directly - bypasses react-leaflet's MapContainer which has React strict mode issues
const MapComponent: React.FC<MapComponentProps> = ({
  destinations,
  activities = [],
  onDestinationClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Filter destinations with coordinates
    const validDestinations = destinations.filter((d) => d.latitude && d.longitude);
    
    // Create a map of destination coords for activities that reference destinations
    const destCoordMap = new Map(
      destinations.map((d) => [d.id, { lat: d.latitude, lng: d.longitude, name: d.name }])
    );
    
    // Filter activities - include those with direct coordinates OR those referencing a destination with coordinates
    const validActivities = activities.filter((a) => {
      // If activity has its own coordinates, include it
      if ((a as any).latitude && (a as any).longitude) return true;
      // Otherwise, only include if it references a destination that has coordinates
      if (a.destinationId && destCoordMap.has(a.destinationId)) return true;
      return false;
    });

    if (validDestinations.length === 0 && validActivities.length === 0) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    // Calculate center from all valid points
    const allPoints = [
      ...validDestinations.map((d) => ({ lat: d.latitude!, lng: d.longitude! })),
      ...validActivities
        .map((a) => {
          if ((a as any).latitude && (a as any).longitude) {
            return { lat: (a as any).latitude, lng: (a as any).longitude };
          }
          const destCoords = destCoordMap.get(a.destinationId!);
          return destCoords ? { lat: destCoords.lat!, lng: destCoords.lng! } : null;
        })
        .filter((p) => p !== null) as Array<{ lat: number; lng: number }>,
    ];

    const center: [number, number] = [
      allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length,
      allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length,
    ];

    // Check if map already exists - if so, just update markers
    if (mapRef.current) {
      // Clear previous markers
      markersRef.current.forEach((marker) => mapRef.current?.removeLayer(marker));
      markersRef.current = [];

      // Add destination markers
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

      // Add activity markers
      validActivities.forEach((activity) => {
        const activityLat = (activity as any).latitude;
        const activityLng = (activity as any).longitude;
        const lat = activityLat && activityLng ? activityLat : destCoordMap.get(activity.destinationId!)?.lat;
        const lng = activityLat && activityLng ? activityLng : destCoordMap.get(activity.destinationId!)?.lng;
        
        if (lat && lng) {
          const destName = destCoordMap.get(activity.destinationId!)?.name || '';
          const marker = L.marker([lat, lng], {
            icon: createActivityMarkerIcon(activity.category),
          }).bindPopup(
            `<div class="min-w-[200px]">
              ${activity.mainPhotoUrl ? `<img src="${activity.mainPhotoUrl}" alt="${activity.name}" class="w-full h-24 object-cover rounded mb-2" />` : ''}
              <h3 class="font-bold text-sm">${activity.name}</h3>
              ${activity.location ? `<p class="text-xs text-gray-600">📍 ${activity.location}</p>` : ''}
              ${destName ? `<p class="text-xs text-gray-500">@ ${destName}</p>` : ''}
              <p class="text-xs mt-1"><span class="inline-block px-2 py-1 rounded text-white text-xs font-semibold" style="background-color: #6b7280; opacity: 0.8">${activity.category}</span></p>
            </div>`
          );
          marker.addTo(mapRef.current!);
          markersRef.current.push(marker);
        }
      });

      // Fit bounds
      const bounds = L.latLngBounds(allPoints.map((p) => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      return;
    }

    // Create new map instance only once
    mapRef.current = L.map(containerRef.current).setView(center, 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    // Add destination markers
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

    // Add activity markers
    validActivities.forEach((activity) => {
      const activityLat = (activity as any).latitude;
      const activityLng = (activity as any).longitude;
      const lat = activityLat && activityLng ? activityLat : destCoordMap.get(activity.destinationId!)?.lat;
      const lng = activityLat && activityLng ? activityLng : destCoordMap.get(activity.destinationId!)?.lng;
      
      if (lat && lng) {
        const destName = destCoordMap.get(activity.destinationId!)?.name || '';
        const marker = L.marker([lat, lng], {
          icon: createActivityMarkerIcon(activity.category),
        }).bindPopup(
          `<div class="min-w-[200px]">
            ${activity.mainPhotoUrl ? `<img src="${activity.mainPhotoUrl}" alt="${activity.name}" class="w-full h-24 object-cover rounded mb-2" />` : ''}
            <h3 class="font-bold text-sm">${activity.name}</h3>
            ${activity.location ? `<p class="text-xs text-gray-600">📍 ${activity.location}</p>` : ''}
            ${destName ? `<p class="text-xs text-gray-500">@ ${destName}</p>` : ''}
            <p class="text-xs mt-1"><span class="inline-block px-2 py-1 rounded text-white text-xs font-semibold" style="background-color: #6b7280; opacity: 0.8">${activity.category}</span></p>
          </div>`
        );
        marker.addTo(mapRef.current!);
        markersRef.current.push(marker);
      }
    });

    // Fit bounds
    const bounds = L.latLngBounds(allPoints.map((p) => [p.lat, p.lng]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [destinations, activities, onDestinationClick]);

  // Filter destinations with coordinates
  const validDestinations = destinations.filter((d) => d.latitude && d.longitude);

  if (validDestinations.length === 0 && activities.filter((a) => (a as any).latitude && (a as any).longitude).length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-600">No destinations or activities with location data to display on map</p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-96 rounded-lg overflow-hidden" />;
};

export default MapComponent;
