import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

interface CoordinatesResponse {
  latitude: number;
  longitude: number;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoordinatesResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { place, country } = req.query;

  if (!place) {
    return res.status(400).json({ error: "Place is required" });
  }

  try {
    // Build the query string - Nominatim handles country codes well
    const query = country 
      ? `${place}, ${country}` 
      : place;

    console.log(`[coordinates] Fetching coordinates for: "${query}"`);

    // Use OpenStreetMap Nominatim API (free, no API key required)
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: query,
          format: "json",
          limit: 1,
        },
        headers: {
          // Nominatim requires a User-Agent header
          "User-Agent": "FamilyRoadtrip2028/1.0 (https://fambalker.nl)",
        },
        timeout: 5000, // 5 second timeout
      }
    );

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      const result = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      };
      console.log(`[coordinates] Success: ${result.latitude}, ${result.longitude}`);
      return res.status(200).json(result);
    }

    console.log(`[coordinates] No results found for: "${query}"`);
    return res.status(404).json({ error: "Location not found" });
  } catch (error: any) {
    console.error("[coordinates] Error fetching from Nominatim:", error.message);
    
    // Provide more specific error messages
    let errorMessage = "Failed to fetch coordinates";
    if (error.code === "ECONNREFUSED") {
      errorMessage = "Nominatim service unavailable";
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      errorMessage = "Nominatim request timeout";
    } else if (error.response?.status === 429) {
      errorMessage = "Too many requests to Nominatim service";
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}
