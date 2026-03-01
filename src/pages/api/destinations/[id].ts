import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import * as permissionsApi from "@/api/itemPermissions";

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

      // Check view permission for non-creators
      const canView = await permissionsApi.canViewItem(id as string, userEmail);
      if (!canView) {
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

      // Creators can always edit their own destinations
      let canEdit = destination.addedBy === userEmail;
      if (!canEdit) {
        // Check edit permission for non-creators
        canEdit = await permissionsApi.canEditItem(id as string, userEmail);
      }

      if (!canEdit) {
        return res.status(403).json({ error: "You do not have permission to edit this destination" });
      }

      const updated = await destinationApi.updateDestination(id as string, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Destination not found" });
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
