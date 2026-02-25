import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/authConfig";
import { TripSchema } from "@/types/schema";
import * as tripsApi from "@/api/trips";

// Schema for PUT request - allows partial updates with date coercion
const UpdateTripSchema = TripSchema.pick({
  name: true,
  goal: true,
  startDate: true,
  endDate: true,
  totalBudget: true,
  currency: true,
  people: true,
  hasPet: true,
  description: true,
  status: true,
}).partial(); // Make all fields optional for partial updates

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Trip ID is required" });
  }

  if (req.method === "GET") {
    try {
      const tripData = await tripsApi.getTripWithStats(id);
      if (!tripData) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.status(200).json(tripData);
    } catch (error) {
      console.error("Error fetching trip:", error);
      res.status(500).json({ error: "Failed to fetch trip" });
    }
  } else if (req.method === "PUT") {
    try {
      // Validate and coerce request body
      const validatedData = UpdateTripSchema.parse(req.body);
      const trip = await tripsApi.updateTrip(id, validatedData);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.status(200).json(trip);
    } catch (error) {
      console.error("Error updating trip:", error);
      res.status(500).json({ error: "Failed to update trip" });
    }
  } else if (req.method === "DELETE") {
    try {
      const success = await tripsApi.deleteTrip(id);
      if (!success) {
        return res.status(404).json({ error: "Trip not found" });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting trip:", error);
      res.status(500).json({ error: "Failed to delete trip" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
