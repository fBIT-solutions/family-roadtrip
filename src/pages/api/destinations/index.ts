import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import { canViewTripDestinations } from "@/lib/auth-helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.error("No session found - Authorization required");
    return res.status(401).json({ error: "Unauthorized", details: "No valid session" });
  }

  const userEmail = session.user?.email;
  console.log(`Destinations API called by: ${userEmail}`);

  if (req.method === "GET") {
    try {
      const { tripId } = req.query;

      // If tripId is provided, filter destinations for that trip and check access
      if (tripId && typeof tripId === "string") {
        const trip = await tripsApi.getTrip(tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Check if user has access to view destinations in this trip
        if (!canViewTripDestinations(trip, userEmail)) {
          return res.status(403).json({ error: "You do not have access to this trip's destinations" });
        }

        const destinations = await destinationApi.getDestinationsByTrip(tripId);
        return res.status(200).json(destinations);
      }

      // If no tripId, return all destinations (legacy behavior, could be restricted)
      const destinations = await destinationApi.getDestinations();
      console.log(`Returning ${destinations.length} destinations`);
      res.status(200).json(destinations);
    } catch (error) {
      console.error("API Error fetching destinations:", error);
      res.status(500).json({ error: "Failed to fetch destinations", details: String(error) });
    }
  } else if (req.method === "POST") {
    try {
      const destination = await destinationApi.createDestination({
        ...req.body,
        addedBy: userEmail || "",
      });
      res.status(201).json(destination);
    } catch (error) {
      res.status(500).json({ error: "Failed to create destination" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
