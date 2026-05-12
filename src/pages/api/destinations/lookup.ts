import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";
import * as itemReferencesApi from "@/api/itemReferences";
import { canViewTrip } from "@/lib/auth-helpers";
import * as tripsApi from "@/api/trips";

/**
 * Lookup endpoint that handles both destination IDs and ItemReference IDs
 * First tries to find a destination, then falls back to item-references
 * If found in item-references, combines the reference with original destination data
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email || "";

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "ID is required" });
  }

  try {
    // First, try to fetch as a direct destination
    const destination = await destinationApi.getDestination(id);
    
    if (destination) {
      // Check access permissions
      if (destination.public) {
        // Public destinations are viewable by anyone
        return res.status(200).json({
          destination,
          isReference: false,
          type: "destination",
        });
      }

      // For non-public destinations, check authentication
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Creators can always view their own destinations
      if (destination.addedBy === userEmail) {
        return res.status(200).json({
          destination,
          isReference: false,
          type: "destination",
        });
      }

      // If destination is in a trip, check trip access
      if (destination.tripId) {
        const trip = await tripsApi.getTrip(destination.tripId);
        if (trip && canViewTrip(trip, userEmail)) {
          return res.status(200).json({
            destination,
            isReference: false,
            type: "destination",
          });
        }
      }

      // No access
      return res.status(403).json({ error: "You do not have access to this destination" });
    }

    // If not found as destination, try to fetch as ItemReference
    if (!session) {
      return res.status(404).json({ error: "Destination not found" });
    }

    // Get all item references for this user
    const userReferences = await itemReferencesApi.getItemReferencesByUser(userEmail);
    const reference = userReferences.find((ref) => ref.id === id && ref.type === "destination");

    if (!reference) {
      return res.status(404).json({ error: "Destination not found" });
    }

    // Verify user still has access to the trip (if there is one)
    if (reference.tripId) {
      const trip = await tripsApi.getTrip(reference.tripId);
      if (!trip || !trip.people.includes(userEmail)) {
        return res.status(403).json({ error: "You no longer have access to this destination" });
      }
    }

    // Fetch the original destination for complete data
    let originalDestination = await destinationApi.getDestination(reference.originalItemId);

    if (!originalDestination) {
      // If original destination not found, use reference data only
      originalDestination = {
        id: reference.originalItemId,
        name: reference.name,
        place: reference.place || "",
        country: reference.country || "",
        description: reference.description,
        mainPhotoUrl: reference.mainPhotoUrl,
        latitude: reference.latitude,
        longitude: reference.longitude,
        estimatedBudget: 0,
        currency: "EUR",
        votes: 0,
        votedBy: [],
        addedBy: reference.originalCreatorId,
        urls: [],
        public: false,
        createdAt: reference.createdAt,
        updatedAt: reference.updatedAt,
      } as any;
    }

    // Combine reference data with original destination data
    // Reference data takes precedence for user-specific fields
    const combinedDestination = {
      ...originalDestination,
      // User-specific status from reference overrides original
      status: reference.status || originalDestination?.status || "proposed",
      // Include reference metadata
      referenceId: reference.id,
      originalDestinationId: reference.originalItemId,
      isLinkedByUser: true,
    };

    res.status(200).json({
      destination: combinedDestination,
      isReference: true,
      referenceId: reference.id,
      type: "reference",
      originalCreatorId: reference.originalCreatorId,
    });
  } catch (error) {
    console.error("Error in destination lookup:", error);
    res.status(500).json({ error: "Failed to fetch destination" });
  }
}
