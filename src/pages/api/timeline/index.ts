import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as timelineApi from "@/api/timeline";
import * as tripsApi from "@/api/trips";
import { canViewTripSchedule, canEditTripSchedule } from "@/lib/auth-helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const { tripId } = req.query;
      const userEmail = session.user?.email || "";

      if (tripId && typeof tripId === "string") {
        // Trip-scoped query
        const trip = await tripsApi.getTrip(tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        if (!canViewTripSchedule(trip, userEmail)) {
          return res.status(403).json({ error: "Access denied to this trip's schedule" });
        }

        // Get events for this trip only
        const allEvents = await timelineApi.getTimelineEvents();
        const tripEvents = allEvents.filter((event: any) => event.tripId === tripId);
        res.status(200).json(tripEvents);
      } else {
        // Legacy: fetch all events (for non-trip-scoped usage)
        const events = await timelineApi.getTimelineEvents();
        res.status(200).json(events);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch timeline events" });
    }
  } else if (req.method === "POST") {
    try {
      const { tripId } = req.query;
      const userEmail = session.user?.email || "";

      if (tripId && typeof tripId === "string") {
        // Verify user can edit trip schedule
        const trip = await tripsApi.getTrip(tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        if (!canEditTripSchedule(trip, userEmail)) {
          return res.status(403).json({ error: "You cannot add events to this trip" });
        }
      }

      const event = await timelineApi.createTimelineEvent({
        ...req.body,
        createdBy: userEmail,
        tripId: tripId || req.body.tripId,
      });
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create timeline event" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
