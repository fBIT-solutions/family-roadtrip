import { containers } from "@/lib/cosmosdb";
import { TravelerRequest, TravelerRequestSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Create a traveler request (guest asking to become a traveler)
 */
export async function createTravelerRequest(
  tripId: string,
  requesterEmail: string,
  requesterName?: string,
  ownerId?: string
): Promise<TravelerRequest> {
  // Get trip to find owner if not provided
  let finalOwnerId = ownerId;
  if (!finalOwnerId) {
    const { resource: trip } = await containers.trips.item(tripId, tripId).read();
    if (!trip) throw new Error("Trip not found");
    finalOwnerId = trip.createdBy;
  }

  if (!finalOwnerId) {
    throw new Error("Unable to determine trip owner");
  }

  const request: TravelerRequest = {
    id: uuidv4(),
    tripId,
    requesterEmail,
    requesterName: requesterName || requesterEmail,
    ownerId: finalOwnerId,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.travelerRequests.items.create(request);
    return request;
  } catch (error) {
    console.error("Error creating traveler request:", error);
    throw error;
  }
}

/**
 * Get traveler requests for a trip (for owner to view)
 */
export async function getTravelerRequestsByTrip(tripId: string): Promise<TravelerRequest[]> {
  try {
    const { resources } = await containers.travelerRequests.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId ORDER BY c.createdAt DESC",
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();

    return resources.map((r: any) => TravelerRequestSchema.parse(r));
  } catch (error) {
    console.error("Error fetching traveler requests:", error);
    return [];
  }
}

/**
 * Get traveler requests for a user (for user to view their requests)
 */
export async function getTravelerRequestsByUser(userEmail: string): Promise<TravelerRequest[]> {
  try {
    const { resources } = await containers.travelerRequests.items
      .query({
        query: "SELECT * FROM c WHERE c.requesterEmail = @email ORDER BY c.createdAt DESC",
        parameters: [{ name: "@email", value: userEmail }],
      })
      .fetchAll();

    return resources.map((r: any) => TravelerRequestSchema.parse(r));
  } catch (error) {
    console.error("Error fetching traveler requests:", error);
    return [];
  }
}

/**
 * Get a single traveler request
 */
export async function getTravelerRequest(requestId: string): Promise<TravelerRequest | null> {
  try {
    const { resource } = await containers.travelerRequests.item(requestId, requestId).read();
    if (!resource) return null;
    return TravelerRequestSchema.parse(resource);
  } catch (error) {
    console.error("Error fetching traveler request:", error);
    return null;
  }
}

/**
 * Check if a pending request exists for a user on a trip
 */
export async function hasPendingRequest(tripId: string, userEmail: string): Promise<boolean> {
  try {
    const { resources } = await containers.travelerRequests.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId AND c.requesterEmail = @email AND c.status = 'pending'",
        parameters: [
          { name: "@tripId", value: tripId },
          { name: "@email", value: userEmail },
        ],
      })
      .fetchAll();

    return resources.length > 0;
  } catch (error) {
    console.error("Error checking pending request:", error);
    return false;
  }
}

/**
 * Approve a traveler request (add user to trip.people and update request status)
 */
export async function approveTravelerRequest(requestId: string): Promise<TravelerRequest | null> {
  try {
    const request = await getTravelerRequest(requestId);
    if (!request) return null;

    // Get trip and add requester to people array
    const { resource: trip } = await containers.trips.item(request.tripId, request.tripId).read();
    if (!trip) throw new Error("Trip not found");

    if (!trip.people.includes(request.requesterEmail)) {
      trip.people.push(request.requesterEmail);
      await containers.trips.item(request.tripId, request.tripId).replace(trip);
    }

    // Import permissionsApi to grant permission
    const { grantPermission } = await import("./itemPermissions");
    await grantPermission(request.tripId, "trip", request.requesterEmail, "contributor");

    // Update request status
    const updated: TravelerRequest = {
      ...request,
      status: "approved",
      updatedAt: new Date(),
    };

    await containers.travelerRequests.item(requestId, requestId).replace(updated);
    return updated;
  } catch (error) {
    console.error("Error approving traveler request:", error);
    throw error;
  }
}

/**
 * Reject a traveler request
 */
export async function rejectTravelerRequest(requestId: string): Promise<TravelerRequest | null> {
  try {
    const request = await getTravelerRequest(requestId);
    if (!request) return null;

    const updated: TravelerRequest = {
      ...request,
      status: "rejected",
      updatedAt: new Date(),
    };

    await containers.travelerRequests.item(requestId, requestId).replace(updated);
    return updated;
  } catch (error) {
    console.error("Error rejecting traveler request:", error);
    throw error;
  }
}

/**
 * Delete a traveler request
 */
export async function deleteTravelerRequest(requestId: string): Promise<boolean> {
  try {
    await containers.travelerRequests.item(requestId, requestId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting traveler request:", error);
    return false;
  }
}
