import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/authConfig";
import * as tripsApi from "@/api/trips";
import { canManageTripMembers } from "@/lib/auth-helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const userEmail = session.user?.email;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Trip ID is required" });
  }

  if (req.method === "POST") {
    try {
      // Fetch the trip to check permissions
      const trip = await tripsApi.getTrip(id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Only creator can manage members
      if (!canManageTripMembers(trip, userEmail)) {
        return res.status(403).json({ error: "Only the trip creator can manage members" });
      }

      const { email, role } = req.body; // role: "traveler" | "viewer"

      if (!email || !["traveler", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid email or role" });
      }

      // Check if already a member
      if (trip.people.includes(email) || trip.viewers.includes(email)) {
        return res.status(400).json({ error: "User is already a member of this trip" });
      }

      // Add member based on role
      const updates: any = {};
      if (role === "traveler") {
        updates.people = [...trip.people, email];
      } else if (role === "viewer") {
        updates.viewers = [...trip.viewers, email];
      }

      const updated = await tripsApi.updateTrip(id, updates);
      if (!updated) {
        return res.status(500).json({ error: "Failed to add member" });
      }

      res.status(200).json(updated);
    } catch (error) {
      console.error("Error adding trip member:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  } else if (req.method === "DELETE") {
    try {
      // Fetch the trip to check permissions
      const trip = await tripsApi.getTrip(id);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Only creator can manage members
      if (!canManageTripMembers(trip, userEmail)) {
        return res.status(403).json({ error: "Only the trip creator can manage members" });
      }

      const { email } = req.query;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      // Remove from travelers or viewers
      const updates: any = {};
      if (trip.people.includes(email)) {
        updates.people = trip.people.filter((e) => e !== email);
      }
      if (trip.viewers.includes(email)) {
        updates.viewers = trip.viewers.filter((e) => e !== email);
      }

      if (!updates.people && !updates.viewers) {
        return res.status(400).json({ error: "User is not a member of this trip" });
      }

      const updated = await tripsApi.updateTrip(id, updates);
      if (!updated) {
        return res.status(500).json({ error: "Failed to remove member" });
      }

      res.status(200).json(updated);
    } catch (error) {
      console.error("Error removing trip member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
