import { containers } from "@/lib/cosmosdb";
import { Destination, DestinationSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";
import * as permissionsApi from "./itemPermissions";
import * as tripsApi from "./trips";

export async function createDestination(
  data: Omit<Destination, "id" | "createdAt" | "updatedAt" | "votes" | "votedBy">,
  creatorEmail?: string,
  tripId?: string
): Promise<Destination> {
  const destination: Destination = {
    ...data,
    id: uuidv4(),
    votes: creatorEmail ? 1 : 0,
    votedBy: creatorEmail ? [creatorEmail] : [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.destinations.items.create(destination);
    
    // Grant permissions if creator email and/or tripId are provided
    if (creatorEmail) {
      // Creator gets owner permission
      await permissionsApi.grantPermission(
        destination.id,
        "destination",
        creatorEmail,
        "owner",
        tripId ? "trip" : undefined,
        tripId
      );
      
      // If destination is linked to a trip, grant permissions to trip members
      if (tripId) {
        const trip = await tripsApi.getTrip(tripId);
        if (trip) {
          // Grant contributor access to travelers
          for (const email of trip.people) {
            if (email !== creatorEmail) {
              await permissionsApi.grantPermission(
                destination.id,
                "destination",
                email,
                "contributor",
                "trip",
                tripId
              );
            }
          }
          
          // Grant reader access to viewers
          for (const email of trip.viewers) {
            if (email !== creatorEmail) {
              await permissionsApi.grantPermission(
                destination.id,
                "destination",
                email,
                "reader",
                "trip",
                tripId
              );
            }
          }
        }
      }
    }
    
    return destination;
  } catch (error) {
    console.error("Error creating destination:", error);
    throw new Error("Failed to create destination");
  }
}

/**
 * Get destinations that a user can see:
 * 1. Destinations they created (addedBy = userId)
 * 2. Destinations in trips they are part of (creator, traveler, or viewer)
 * 3. Public destinations from other users
 */
export async function getDestinationsForUser(
  userId: string,
  userTripIds: string[] = []
): Promise<Destination[]> {
  try {
    // Get destinations user created or are in their trips
    let query = "SELECT * FROM c WHERE c.addedBy = @userId";
    const parameters: any[] = [{ name: "@userId", value: userId }];

    // Add destinations from user's trips if any
    if (userTripIds.length > 0) {
      const placeholders = userTripIds.map((_, i) => `@tripId${i}`).join(",");
      query += ` OR c.tripId IN (${placeholders})`;
      userTripIds.forEach((tripId, i) => {
        parameters.push({ name: `@tripId${i}`, value: tripId });
      });
    }

    // Add public destinations (visible to everyone)
    query += ` OR c.public = true`;
    query += ` ORDER BY c.votes DESC`;

    const { resources } = await containers.destinations.items
      .query({
        query,
        parameters,
      })
      .fetchAll();

    console.log(`Fetched ${resources.length} destinations for user ${userId}`);
    const parsed = resources.map((r: any) => {
      try {
        return DestinationSchema.parse(r);
      } catch (parseError) {
        console.error("Error parsing destination:", r, parseError);
        throw parseError;
      }
    });
    return parsed;
  } catch (error) {
    console.error("Error fetching destinations for user:", error);
    throw error;
  }
}

/**
 * Get only public destinations (for public discovery)
 */
export async function getPublicDestinations(excludeCreatorEmail?: string): Promise<Destination[]> {
  try {
    let query = "SELECT * FROM c WHERE c.public = true ORDER BY c.votes DESC";
    let parameters: any[] = [];

    // Optionally exclude destinations created by a specific user
    if (excludeCreatorEmail) {
      query = "SELECT * FROM c WHERE c.public = true AND c.addedBy != @creatorEmail ORDER BY c.votes DESC";
      parameters = [{ name: "@creatorEmail", value: excludeCreatorEmail }];
    }

    const { resources } = await containers.destinations.items
      .query({
        query,
        parameters,
      })
      .fetchAll();

    console.log(`Fetched ${resources.length} public destinations`);
    const parsed = resources.map((r: any) => {
      try {
        return DestinationSchema.parse(r);
      } catch (parseError) {
        console.error("Error parsing destination:", r, parseError);
        throw parseError;
      }
    });
    return parsed;
  } catch (error) {
    console.error("Error fetching public destinations:", error);
    throw error;
  }
}

/**
 * Legacy function: Get destinations for user (permission-aware)
 * DEPRECATED: Use getDestinationsForUser() instead
 * Now returns user-visible destinations only
 */
export async function getDestinations(userId?: string, userTripIds: string[] = []): Promise<Destination[]> {
  if (!userId) {
    console.warn("getDestinations() called without userId - returning only public destinations");
    return getPublicDestinations();
  }
  return getDestinationsForUser(userId, userTripIds);
}

export async function getDestination(id: string): Promise<Destination | null> {
  try {
    const { resources } = await containers.destinations.items
      .query({
        query: `SELECT * FROM c WHERE c.id = @id`,
        parameters: [{ name: "@id", value: id }],
      })
      .fetchAll();

    if (resources.length === 0) return null;
    return DestinationSchema.parse(resources[0]);
  } catch (error) {
    console.error("Error fetching destination:", error);
    return null;
  }
}

export async function getDestinationsByTrip(tripId: string): Promise<Destination[]> {
  try {
    const { resources } = await containers.destinations.items
      .query({
        query: `SELECT * FROM c WHERE c.tripId = @tripId ORDER BY c.votes DESC`,
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();

    return resources.map((r: any) => DestinationSchema.parse(r));
  } catch (error) {
    console.error("Error fetching destinations for trip:", error);
    throw error;
  }
}

export async function updateDestination(
  id: string,
  data: Partial<Destination>
): Promise<Destination | null> {
  try {
    const existing = await getDestination(id);
    if (!existing) return null;

    const updated: Destination = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    const { resource } = await containers.destinations
      .item(id, id)
      .replace(updated);
    return resource ? DestinationSchema.parse(resource) : null;
  } catch (error) {
    console.error("Error updating destination:", error);
    return null;
  }
}

export async function voteForDestination(id: string, userId: string): Promise<boolean> {
  try {
    console.log(`Voting on destination ${id} by user ${userId}`);
    const destination = await getDestination(id);
    console.log(`Destination found:`, destination ? "yes" : "no");
    if (!destination) return false;

    if (destination.votedBy.includes(userId)) {
      // Remove vote
      destination.votedBy = destination.votedBy.filter((u) => u !== userId);
      destination.votes--;
    } else {
      // Add vote
      destination.votedBy.push(userId);
      destination.votes++;
    }

    destination.updatedAt = new Date();
    console.log(`Updating destination with votes: ${destination.votes}`);
    await containers.destinations.item(id, id).replace(destination);
    console.log("Vote saved successfully");
    return true;
  } catch (error) {
    console.error("Error voting for destination:", error);
    return false;
  }
}

export async function deleteDestination(id: string): Promise<boolean> {
  try {
    const destination = await getDestination(id);
    if (!destination) return false;
    
    await containers.destinations.item(id, id).delete();
    return true;
  } catch (error) {
    console.error("Error deleting destination:", error);
    return false;
  }
}

/**
 * Get all destinations for a trip, including:
 * - Destinations directly linked (tripId = id)
 * - User-specific item references (for public destinations)
 * Returns normalized Destination-like objects with metadata
 */
export async function getDestinationsForTrip(
  tripId: string,
  userId?: string
): Promise<(Destination & { isReference?: boolean; referenceId?: string; originalDestinationId?: string })[]> {
  try {
    // Get directly linked destinations
    const directDestinations = await getDestinationsByTrip(tripId);

    // Get item references if userId provided
    let references: any[] = [];
    if (userId) {
      const itemReferencesApi = await import("./itemReferences");
      const itemRefs = await itemReferencesApi.getItemReferencesByUserAndTrip(userId, tripId);
      references = itemRefs.filter((ref) => ref.type === "destination");
    }

    // Combine and normalize: convert references to Destination-like format
    const combined = [
      ...directDestinations.map((d) => ({ ...d, isReference: false })),
      ...references.map((ref) => ({
        // Convert ItemReference to Destination-like object
        id: ref.id,
        name: ref.name,
        place: ref.place,
        country: ref.country,
        description: ref.description,
        mainPhotoUrl: ref.mainPhotoUrl,
        latitude: ref.latitude,
        longitude: ref.longitude,
        estimatedBudget: ref.estimatedBudget || 0,
        currency: "EUR", // Default, could be stored in reference
        status: ref.status || "proposed",
        votes: 0,
        votedBy: [],
        addedBy: ref.originalCreatorId,
        tripId: tripId,
        urls: [],
        public: false, // References are user-specific
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt,
        // Mark as reference for UI differentiation
        isReference: true,
        referenceId: ref.id,
        originalDestinationId: ref.originalItemId,
      })),
    ];

    return combined;
  } catch (error) {
    console.error("Error fetching destinations for trip:", error);
    return [];
  }
}

export async function getDestinationsContainer() {
  return containers.destinations;
}
