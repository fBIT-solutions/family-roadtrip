import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/authConfig";
import { TripSchema } from "@/types/schema";
import * as tripsApi from "@/api/trips";
import { canViewTrip, canEditTrip, canManageTripMembers } from "@/lib/auth-helpers";
import { notifyUserAddedToTrip, notifyUserRemovedFromTrip } from "@/lib/notifications";

// Schema for PUT request - allows partial updates with date coercion
const UpdateTripSchema = TripSchema.pick({
  name: true,
  goal: true,
  startDate: true,
  endDate: true,
  totalBudget: true,
  currency: true,
  people: true,
  viewers: true,
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
  const userEmail = session.user?.email;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Trip ID is required" });
  }

  if (req.method === "GET") {
    try {
      const tripData = await tripsApi.getTripWithStats(id);
      if (!tripData) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Check if user has access to this trip
      if (!canViewTrip(tripData.trip, userEmail)) {
        return res.status(403).json({ error: "You do not have access to this trip" });
      }

      res.status(200).json(tripData);
    } catch (error) {
      console.error("Error fetching trip:", error);
      res.status(500).json({ error: "Failed to fetch trip" });
    }
  } else if (req.method === "PUT") {
    try {
      // First fetch the trip to check permissions
      const exists = await tripsApi.getTrip(id);
      if (!exists) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Check if user can edit this trip
      if (!canEditTrip(exists, userEmail)) {
        return res.status(403).json({ error: "You do not have permission to edit this trip" });
      }

      // Validate and coerce request body
      const validatedData = UpdateTripSchema.parse(req.body);
      const trip = await tripsApi.updateTrip(id, validatedData);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Send notifications for added/removed travelers
      if (validatedData.people) {
        const newTravelers = (validatedData.people || []).filter(
          email => !exists.people.includes(email)
        );
        const removedTravelers = exists.people.filter(
          email => !(validatedData.people || []).includes(email)
        );

        // Notify new travelers
        if (newTravelers.length > 0) {
          console.log(
            `Sending notifications to new travelers: ${newTravelers.join(", ")}`
          );
          const tripUrl = `${process.env.NEXTAUTH_URL}/trips/${id}`;
          for (const email of newTravelers) {
            try {
              await notifyUserAddedToTrip(
                [email],
                email.split("@")[0],
                trip.name,
                userEmail || "Unknown",
                tripUrl
              );
            } catch (emailError) {
              console.error(
                `Failed to send added-to-trip notification to ${email}:`,
                emailError
              );
            }
          }
        }

        // Notify removed travelers
        if (removedTravelers.length > 0) {
          console.log(
            `Sending notifications to removed travelers: ${removedTravelers.join(", ")}`
          );
          for (const email of removedTravelers) {
            try {
              await notifyUserRemovedFromTrip(email, email.split("@")[0], trip.name);
            } catch (emailError) {
              console.error(
                `Failed to send removed-from-trip notification to ${email}:`,
                emailError
              );
            }
          }
        }
      }

      // Send notifications for added/removed viewers
      if (validatedData.viewers) {
        const newViewers = (validatedData.viewers || []).filter(
          email => !exists.viewers.includes(email)
        );
        const removedViewers = exists.viewers.filter(
          email => !(validatedData.viewers || []).includes(email)
        );

        // Notify new viewers (they are also added to the trip)
        if (newViewers.length > 0) {
          console.log(`Sending notifications to new viewers: ${newViewers.join(", ")}`);
          const tripUrl = `${process.env.NEXTAUTH_URL}/trips/${id}`;
          for (const email of newViewers) {
            try {
              await notifyUserAddedToTrip(
                [email],
                email.split("@")[0],
                trip.name,
                userEmail || "Unknown",
                tripUrl
              );
            } catch (emailError) {
              console.error(
                `Failed to send added-to-trip notification to ${email}:`,
                emailError
              );
            }
          }
        }

        // Notify removed viewers
        if (removedViewers.length > 0) {
          console.log(`Sending notifications to removed viewers: ${removedViewers.join(", ")}`);
          for (const email of removedViewers) {
            try {
              await notifyUserRemovedFromTrip(email, email.split("@")[0], trip.name);
            } catch (emailError) {
              console.error(
                `Failed to send removed-from-trip notification to ${email}:`,
                emailError
              );
            }
          }
        }
      }

      res.status(200).json(trip);
    } catch (error) {
      console.error("Error updating trip:", error);
      res.status(500).json({ error: "Failed to update trip" });
    }
  } else if (req.method === "DELETE") {
    try {
      // First fetch the trip to check permissions
      const exists = await tripsApi.getTrip(id);
      if (!exists) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Only creator can delete
      if (!canManageTripMembers(exists, userEmail)) {
        return res.status(403).json({ error: "Only the trip creator can delete this trip" });
      }

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
