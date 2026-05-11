import axios from "axios";

interface Coordinates {
  latitude: number;
  longitude: number;
}

// Simple in-memory cache for coordinates to avoid rate limiting
const coordinatesCache = new Map<string, Coordinates | null>();

/**
 * Generate cache key from place and country
 */
function getCacheKey(place: string, country?: string): string {
  return `${place}|${country || ""}`.toLowerCase();
}

/**
 * Fetch coordinates for a given place and optional country
 * @param place - City, region, or venue name
 * @param country - Optional country name or code
 * @returns Coordinates object or null if not found
 */
export async function fetchCoordinates(
  place: string,
  country?: string
): Promise<Coordinates | null> {
  if (!place && !country) {
    return null;
  }

  const cacheKey = getCacheKey(place, country);

  // Return cached result if available
  if (coordinatesCache.has(cacheKey)) {
    const cached = coordinatesCache.get(cacheKey);
    if (cached) {
      console.log(`[coordinates] Cache hit: ${cached.latitude}, ${cached.longitude}`);
    }
    return cached;
  }

  try {
    // Build params object, only including defined values
    const params: Record<string, string> = {};
    if (place) params.place = place;
    if (country) params.country = country;

    const response = await axios.get("/api/coordinates", { params });

    if (response.data.latitude && response.data.longitude) {
      const coords = {
        latitude: parseFloat(response.data.latitude),
        longitude: parseFloat(response.data.longitude),
      };
      // Cache the successful result
      coordinatesCache.set(cacheKey, coords);
      return coords;
    }
  } catch (error: any) {
    if (error.response?.status === 429) {
      // Rate limited - cache null result for a short time to avoid spamming
      coordinatesCache.set(cacheKey, null);
      console.warn(`[coordinates] Rate limited for: "${place}${country ? ", " + country : ""}"`);
    } else {
      console.error(`[coordinates] Error fetching for "${place}":`, error.message);
    }
  }

  // Cache null to avoid retrying immediately
  coordinatesCache.set(cacheKey, null);
  return null;
}
