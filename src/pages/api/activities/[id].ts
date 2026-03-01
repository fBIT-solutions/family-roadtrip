import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import * as activitiesApi from "@/api/activities";
import * as destinationsApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import { canVoteOnItems } from "@/lib/auth-helpers";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const userEmail = session.user?.email || "";  const { id, action } = req.query;

  if (req.method === "GET") {
    try {
      const activity = await activitiesApi.getActivityById(id as string);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      return res.status(200).json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }
  }

  if (req.method === "PUT") {
    if (action === "vote") {
      try {
        // Get the activity to find its destination
        const activity = await activitiesApi.getActivityById(id as string);
        if (!activity) {
          return res.status(404).json({ error: "Activity not found" });
        }

        // If activity has a destinationId and tripId, check voting permissions
        if (activity.destinationId) {
          const destination = await destinationsApi.getDestination(activity.destinationId);
          if (destination && destination.tripId) {
            const trip = await tripsApi.getTrip(destination.tripId);
            if (trip) {
              // Check if user can vote (travelers only, not viewers)
              if (!canVoteOnItems(trip, userEmail)) {
                return res.status(403).json({
                  error: "You do not have permission to vote",
                  reason: "GUEST_NOT_TRAVELER",
                  tripId: trip.id,
                  tripName: trip.name,
                  tripOwnerEmail: trip.createdBy,
                });
              }
            }
          }
        }

        const updatedActivity = await activitiesApi.voteActivity(id as string, userEmail);
        return res.status(200).json(updatedActivity);
      } catch (error) {
        console.error("Error voting on activity:", error);
        return res.status(500).json({ error: "Failed to vote" });
      }
    }

    if (action === "status") {
      try {
        // Get the activity to check ownership
        const activity = await activitiesApi.getActivityById(id as string);
        if (!activity) {
          return res.status(404).json({ error: "Activity not found" });
        }

        // Creators can always update their own activities
        if (activity.addedBy !== userEmail) {
          return res.status(403).json({ error: "You do not have permission to update this activity" });
        }

        const { status } = req.body;
        const updated = await activitiesApi.updateActivityStatus(id as string, status as any);
        return res.status(200).json(updated);
      } catch (error) {
        console.error("Error updating activity status:", error);
        return res.status(500).json({ error: "Failed to update status" });
      }
    }

    // Generic update
    try {
      // Get the activity to check ownership
      const activity = await activitiesApi.getActivityById(id as string);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Creators can always update their own activities
      if (activity.addedBy !== userEmail) {
        return res.status(403).json({ error: "You do not have permission to edit this activity" });
      }

      const updated = await activitiesApi.updateActivity(id as string, req.body);
      return res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating activity:", error);
      return res.status(500).json({ error: "Failed to update activity" });
    }
  }

  if (req.method === "DELETE") {
    try {
      // Get the activity to check ownership
      const activity = await activitiesApi.getActivityById(id as string);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Creators can always delete their own activities
      if (activity.addedBy !== userEmail) {
        return res.status(403).json({ error: "You do not have permission to delete this activity" });
      }

      await activitiesApi.deleteActivity(id as string);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting activity:", error);
      return res.status(500).json({ error: "Failed to delete activity" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
