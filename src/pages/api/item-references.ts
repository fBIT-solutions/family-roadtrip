import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/authConfig";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Destination, Activity } from "@/types/schema";
import * as itemReferencesApi from "@/api/itemReferences";
import * as destinationsApi from "@/api/destinations";
import * as activitiesApi from "@/api/activities";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email;

  if (req.method === "GET") {
    const { userId, tripId } = req.query;

    try {
      let itemReferences;

      if (userId && tripId && typeof userId === "string" && typeof tripId === "string") {
        // Get references for a specific user in a specific trip
        itemReferences = await itemReferencesApi.getItemReferencesByUserAndTrip(userId, tripId);
      } else if (userId && typeof userId === "string") {
        // Get all references for a user
        itemReferences = await itemReferencesApi.getItemReferencesByUser(userId);
      } else if (tripId && typeof tripId === "string") {
        // Get all references in a specific trip
        itemReferences = await itemReferencesApi.getItemReferencesByTrip(tripId);
      } else {
        // No filters, return user's own references
        itemReferences = await itemReferencesApi.getItemReferencesByUser(userEmail || "");
      }

      return res.status(200).json(itemReferences);
    } catch (error) {
      console.error("Error fetching item references:", error);
      return res.status(500).json({ error: "Failed to fetch item references" });
    }
  }

  if (req.method === "POST") {
    const { type, originalItemId, tripId } = req.body;

    if (!type || !originalItemId) {
      return res.status(400).json({ error: "Missing required fields: type, originalItemId" });
    }

    if (type !== "destination" && type !== "activity") {
      return res.status(400).json({ error: "Invalid type. Must be 'destination' or 'activity'" });
    }

    try {
      // Get the original item to copy data from
      let originalItem;
      if (type === "destination") {
        originalItem = await destinationsApi.getDestination(originalItemId);
      } else {
        originalItem = await activitiesApi.getActivity(originalItemId);
      }

      if (!originalItem) {
        return res.status(404).json({ error: `${type} not found` });
      }

      // Check if the item is public
      if (!originalItem.public) {
        return res.status(403).json({ error: `This ${type} is not public and cannot be added` });
      }

      // Create the reference
      let itemReference;
      if (type === "destination") {
        const destination = originalItem as Destination;
        itemReference = await itemReferencesApi.createDestinationReference(
          originalItemId,
          destination.addedBy,
          userEmail || "",
          {
            name: destination.name,
            description: destination.description,
            place: destination.place,
            country: destination.country,
            latitude: destination.latitude,
            longitude: destination.longitude,
            mainPhotoUrl: destination.mainPhotoUrl,
          },
          tripId
        );
      } else {
        const activity = originalItem as Activity;
        itemReference = await itemReferencesApi.createActivityReference(
          originalItemId,
          activity.addedBy,
          userEmail || "",
          {
            name: activity.name,
            description: activity.description,
            destinationId: activity.destinationId,
            category: activity.category,
            url: activity.url,
            estimatedCost: activity.estimatedCost,
            duration: activity.duration,
          },
          tripId
        );
      }

      return res.status(201).json(itemReference);
    } catch (error) {
      console.error("Error creating item reference:", error);
      return res.status(500).json({ error: "Failed to create item reference" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing or invalid reference ID" });
    }

    try {
      // Get the reference to check ownership
      const container = await itemReferencesApi.getItemReferencesContainer();
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.id = @id",
          parameters: [{ name: "@id", value: id }],
        })
        .fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({ error: "Reference not found" });
      }

      const reference = resources[0];

      // Only the user who added the reference can delete it
      if (reference.userId !== userEmail) {
        return res.status(403).json({ error: "You can only delete your own references" });
      }

      await itemReferencesApi.deleteItemReference(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting item reference:", error);
      return res.status(500).json({ error: "Failed to delete item reference" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
