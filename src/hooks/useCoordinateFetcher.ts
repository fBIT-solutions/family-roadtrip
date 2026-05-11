import { useCallback } from "react";
import { fetchCoordinates as fetchCoordsFromAPI } from "@/lib/coordinatesHelper";

/**
 * Hook to fetch coordinates with a callback
 * Usage: const fetch = useCoordinates((lat, lon) => setFormData({...formData, latitude: lat, longitude: lon}))
 */
export function useCoordinateFetcher(
  onSuccess: (latitude: number, longitude: number) => void
) {
  const fetchCoordinates = useCallback(
    async (place: string, country?: string) => {
      try {
        const coords = await fetchCoordsFromAPI(place, country);
        if (coords) {
          onSuccess(coords.latitude, coords.longitude);
          console.log(
            `Coordinates fetched: ${coords.latitude}, ${coords.longitude}`
          );
        } else {
          console.warn(`No coordinates found for place="${place}" country="${country}"`);
        }
      } catch (error) {
        console.error(`Failed to fetch coordinates for place="${place}" country="${country}":`, error);
      }
    },
    [onSuccess]
  );

  return fetchCoordinates;
}
