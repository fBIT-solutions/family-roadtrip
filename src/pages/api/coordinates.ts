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

  if (!place && !country) {
    return res.status(400).json({ error: "Place or country is required" });
  }

  try {
    const query = `${place}${place && country ? " " : ""}${country}`.trim();
    const response = await axios.get(
      `https://www.gps-coordinates.net/geoproxy?q=${encodeURIComponent(query)}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const { lat, lng } = response.data.results[0].geometry;
      return res.status(200).json({
        latitude: lat,
        longitude: lng,
      });
    }

    return res.status(404).json({ error: "No coordinates found" });
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return res.status(500).json({ error: "Failed to fetch coordinates" });
  }
}
