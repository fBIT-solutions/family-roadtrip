import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/authConfig";
import { TripSchema } from "@/types/schema";
import * as tripsApi from "@/api/trips";

// Schema for POST request (excludes id, createdAt, updatedAt, and days which are server-generated)
const CreateTripSchema = TripSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  days: true,
  createdBy: true,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.error("No session found - Authorization required");
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const trips = await tripsApi.getTrips(session.user?.email || undefined);
      res.status(200).json(trips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  } else if (req.method === "POST") {
    try {
      // Validate and coerce request body
      const validatedData = CreateTripSchema.parse(req.body);
      const trip = await tripsApi.createTrip({
        ...validatedData,
        createdBy: session.user?.email || "",
      });
      res.status(201).json(trip);
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
