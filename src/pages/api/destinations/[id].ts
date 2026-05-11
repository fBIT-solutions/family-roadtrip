import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { canViewTrip } from "@/lib/auth-helpers";
import * as destinationApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import * as permissionsApi from "@/api/itemPermissions";
import * as itemReferencesApi from "@/api/itemReferences";
import { notifyStatusChanged } from "@/lib/notifications";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email || "";
  const { id } = req.query;
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  if (req.method === "GET") {
    try {
      // First fetch the destination to check ownership
      const destination = await destinationApi.getDestination(id as string);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Public destinations are viewable by anyone
      if (destination.public) {
        return res.status(200).json(destination);
      }

      // For non-public destinations, require authentication
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Creators can always view their own destinations
      if (destination.addedBy === userEmail) {
        return res.status(200).json(destination);
      }

      // If destination is in a trip, check trip access (allows viewers)
      if (destination.tripId) {
        const trip = await tripsApi.getTrip(destination.tripId);
        if (trip && canViewTrip(trip, userEmail)) {
          return res.status(200).json(destination);
        }
        // If trip not found or no access, provide trip context in error
        if (trip) {
          return res.status(403).json({
            error: "You do not have access to this destination",
            tripId: trip.id,
            tripName: trip.name,
            tripOwnerEmail: trip.createdBy,
          });
        }
      }

      // For standalone destinations, check granular permissions
      const canView = await permissionsApi.canViewItem(id as string, userEmail);
      if (!canView) {
        return res.status(403).json({ error: "You do not have access to this destination" });
      }

      res.status(200).json(destination);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destination" });
    }
  } else if (req.method === "PUT") {
    try {
      // PUT requires authentication
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // First fetch the destination to check ownership
      const destination = await destinationApi.getDestination(id as string);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Special case: Allow users to link a public destination to their trip
      // This creates an ItemReference instead of modifying the original destination
      const isLinkingOperation = Object.keys(req.body).length === 1 && req.body.tripId;
      if (isLinkingOperation && destination.public) {
        // Verify the user has access to the trip they're linking to
        const newTripId = req.body.tripId;
        const trip = await tripsApi.getTrip(newTripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Check if user is a traveler in this trip (not viewer-only)
        const isTraveler = trip.people.includes(userEmail);
        if (!isTraveler) {
          return res.status(403).json({ error: "You must be a traveler in the trip to add destinations" });
        }

        // Check if already linked
        const existingReferences = await itemReferencesApi.getItemReferencesByUserAndTrip(userEmail, newTripId);
        const alreadyLinked = existingReferences.some(ref => ref.type === "destination" && ref.originalItemId === id);
        if (alreadyLinked) {
          return res.status(400).json({ error: "This destination is already added to your trip" });
        }

        // Create ItemReference for this user
        try {
          const reference = await itemReferencesApi.createDestinationReference(
            id as string,
            destination.addedBy,
            userEmail,
            {
              name: destination.name,
              description: destination.description,
              place: destination.place,
              country: destination.country,
              latitude: destination.latitude,
              longitude: destination.longitude,
              mainPhotoUrl: destination.mainPhotoUrl,
            },
            newTripId
          );

          // Return the reference as the destination for the frontend
          // Frontend needs to understand this is a reference now
          return res.status(200).json({
            ...reference,
            isReference: true,
            originalDestinationId: id,
          });
        } catch (refError) {
          console.error("Error creating destination reference:", refError);
          return res.status(500).json({ error: "Failed to add destination to trip" });
        }
      }

      // For non-public destinations or full edits, require full edit permission
      let canEdit = destination.addedBy === userEmail;
      if (!canEdit) {
        // Check edit permission for non-creators
        canEdit = await permissionsApi.canEditItem(id as string, userEmail);
      }

      if (!canEdit) {
        return res.status(403).json({ error: "You do not have permission to edit this destination" });
      }

      const oldStatus = destination.status;
      const updated = await destinationApi.updateDestination(id as string, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Send notification to trip members if status changed
      if (oldStatus !== updated.status && destination.tripId && userEmail) {
        try {
          const trip = await tripsApi.getTrip(destination.tripId);
          if (trip) {
            // Get all trip members except the person who made the change
            const recipients = [
              ...trip.people.filter((p) => p !== userEmail),
              ...trip.viewers.filter((v) => v !== userEmail),
            ];

            if (recipients.length > 0) {
              const destinationUrl = `${process.env.NEXTAUTH_URL}/destinations/${id}`;
              try {
                await notifyStatusChanged(
                  recipients,
                  updated.name,
                  "destination",
                  oldStatus,
                  updated.status,
                  userEmail,
                  destinationUrl
                );
              } catch (emailError) {
                console.error("Failed to send status change notification email:", emailError);
                // Don't fail the request if email fails to send
              }
            }
          }
        } catch (error) {
          console.error("Error sending status change notification:", error);
        }
      }

      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update destination" });
    }
  } else if (req.method === "DELETE") {
    try {
      // DELETE requires authentication
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // First fetch the destination to check ownership
      const destination = await destinationApi.getDestination(id as string);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Creators can always delete their own destinations
      let isOwnDestination = destination.addedBy === userEmail;
      if (!isOwnDestination) {
        // Check ownership permission for non-creators
        isOwnDestination = await permissionsApi.isOwner(id as string, userEmail);
      }

      if (!isOwnDestination) {
        return res.status(403).json({ error: "Only owner can delete this destination" });
      }

      const success = await destinationApi.deleteDestination(id as string);
      if (!success) {
        return res.status(404).json({ error: "Destination not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete destination" });
    }
  } else if (req.method === "POST" && action === "vote") {
    try {
      // Vote requires authentication
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // First fetch the destination
      const destination = await destinationApi.getDestination(id as string);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Creators can always interact with their own destinations
      let canInteract = destination.addedBy === userEmail;
      if (!canInteract) {
        // Check view permission for non-creators
        canInteract = await permissionsApi.canViewItem(id as string, userEmail);
      }

      if (!canInteract) {
        // If destination is in a trip, provide trip context in error
        if (destination.tripId) {
          const trip = await tripsApi.getTrip(destination.tripId);
          if (trip) {
            return res.status(403).json({
              error: "You do not have access to this destination",
              tripId: trip.id,
              tripName: trip.name,
              tripOwnerEmail: trip.createdBy,
            });
          }
        }
        return res.status(403).json({ error: "You do not have access to this destination" });
      }

      const success = await destinationApi.voteForDestination(id as string, userEmail);
      if (!success) {
        return res.status(404).json({ error: "Destination not found" });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ error: "Failed to vote" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
