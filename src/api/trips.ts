import { containers } from "@/lib/cosmosdb";
import { Trip, TripSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";
import * as permissionsApi from "@/api/itemPermissions";

export async function createTrip(
  data: Omit<Trip, "id" | "createdAt" | "updatedAt" | "days" | "createdBy">,
  creatorEmail: string
): Promise<Trip> {
  // Calculate days from date range
  const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const trip: Trip = {
    ...data,
    id: uuidv4(),
    days,
    createdBy: creatorEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.trips.items.create(trip);
    
    // Grant owner permission to creator
    await permissionsApi.grantPermission(trip.id, "trip", creatorEmail, "owner");
    
    // Grant permissions to travelers (contributors)
    for (const email of data.people || []) {
      if (email !== creatorEmail) {
        await permissionsApi.grantPermission(trip.id, "trip", email, "contributor");
      }
    }
    
    // Grant permissions to viewers (readers)
    for (const email of data.viewers || []) {
      if (email !== creatorEmail) {
        await permissionsApi.grantPermission(trip.id, "trip", email, "reader");
      }
    }
    
    return trip;
  } catch (error) {
    console.error("Error creating trip:", error);
    throw new Error("Failed to create trip");
  }
}

export async function getTrips(userEmail?: string): Promise<Trip[]> {
  try {
    // If no email provided, return all trips (should not happen in production)
    if (!userEmail) {
      const { resources } = await containers.trips.items
        .query("SELECT * FROM c ORDER BY c.startDate DESC")
        .fetchAll();
      console.log(`Fetched ${resources.length} trips (no user filter)`);
      return resources.map((r: any) => TripSchema.parse(r));
    }

    // Get trips where user is creator, traveler, or viewer
    const query = `SELECT * FROM c WHERE 
      c.createdBy = @userEmail OR 
      ARRAY_CONTAINS(c.people, @userEmail) OR 
      ARRAY_CONTAINS(c.viewers, @userEmail) 
      ORDER BY c.startDate DESC`;

    const { resources } = await containers.trips.items
      .query({
        query,
        parameters: [{ name: "@userEmail", value: userEmail }],
      })
      .fetchAll();

    console.log(`Fetched ${resources.length} trips for user ${userEmail}`);
    return resources.map((r: any) => TripSchema.parse(r));
  } catch (error) {
    console.error("Error fetching trips:", error);
    throw error;
  }
}

export async function getTrip(id: string): Promise<Trip | null> {
  try {
    const { resource } = await containers.trips.item(id, id).read();
    if (!resource) return null;
    return TripSchema.parse(resource);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return null;
  }
}

export async function updateTrip(
  id: string,
  data: Partial<Trip>
): Promise<Trip | null> {
  try {
    const existing = await getTrip(id);
    if (!existing) return null;

    // Recalculate days if dates changed
    let days = existing.days;
    if (data.startDate || data.endDate) {
      // Ensure dates are Date objects (coerce if needed)
      const start = new Date(data.startDate || existing.startDate);
      const end = new Date(data.endDate || existing.endDate);
      days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    const updated: Trip = {
      ...existing,
      ...data,
      id: existing.id,
      createdBy: existing.createdBy,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      days,
    };

    // Handle permission updates if people or viewers changed
    if (data.people) {
      // Grant permissions to newly added travelers (contributors)
      const newTravelers = (data.people || []).filter(email => !existing.people.includes(email));
      for (const email of newTravelers) {
        if (email !== existing.createdBy) {
          await permissionsApi.grantPermission(id, "trip", email, "contributor");
        }
      }

      // Revoke permissions for removed travelers
      const removedTravelers = existing.people.filter(email => !(data.people || []).includes(email));
      for (const email of removedTravelers) {
        await permissionsApi.revokePermission(id, email);
      }
    }

    if (data.viewers) {
      // Grant permissions to newly added viewers (readers)
      const newViewers = (data.viewers || []).filter(email => !existing.viewers.includes(email));
      for (const email of newViewers) {
        if (email !== existing.createdBy) {
          await permissionsApi.grantPermission(id, "trip", email, "reader");
        }
      }

      // Revoke permissions for removed viewers
      const removedViewers = existing.viewers.filter(email => !(data.viewers || []).includes(email));
      for (const email of removedViewers) {
        await permissionsApi.revokePermission(id, email);
      }
    }

    const { resource } = await containers.trips.item(id, id).replace(updated);
    return resource ? TripSchema.parse(resource) : null;
  } catch (error) {
    console.error("Error updating trip:", error);
    return null;
  }
}

export async function deleteTrip(id: string): Promise<boolean> {
  try {
    await containers.trips.item(id, id).delete();
    return true;
  } catch (error) {
    console.error("Error deleting trip:", error);
    return false;
  }
}

export async function getTripWithStats(id: string, userEmail?: string) {
  try {
    const trip = await getTrip(id);
    if (!trip) return null;

    // Get destinations for this trip (both direct and references)
    let destinations: any[] = [];
    if (userEmail) {
      // Import at runtime to avoid circular dependency
      const destinationApi = await import("./destinations");
      destinations = await destinationApi.getDestinationsForTrip(id, userEmail);
    } else {
      // Fallback: get only direct destinations if no user email
      const { resources } = await containers.destinations.items
        .query({
          query: "SELECT * FROM c WHERE c.tripId = @tripId",
          parameters: [{ name: "@tripId", value: id }],
        })
        .fetchAll();
      destinations = resources || [];
    }

    // Get expenses for this trip
    const { resources: expenses } = await containers.expenses.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId",
        parameters: [{ name: "@tripId", value: id }],
      })
      .fetchAll();

    const totalSpent = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const remaining = trip.totalBudget - totalSpent;

    return {
      trip,
      destinations: destinations || [],
      expenses: expenses || [],
      stats: {
        totalBudget: trip.totalBudget,
        totalSpent,
        remaining,
        destinationCount: destinations?.length || 0,
        expenseCount: expenses?.length || 0,
      },
    };
  } catch (error) {
    console.error("Error getting trip with stats:", error);
    return null;
  }
}

/**
 * Add a traveler (contributor) to a trip
 */
export async function addTravelerToTrip(tripId: string, travellerEmail: string): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) throw new Error("Trip not found");

    // Add to trip people array if not already present
    if (!trip.people.includes(travellerEmail)) {
      trip.people.push(travellerEmail);
      await containers.trips.item(tripId, tripId).replace(trip);
    }

    // Grant contributor permission
    await permissionsApi.grantPermission(tripId, "trip", travellerEmail, "contributor");

    // Get all destinations in this trip and grant permissions
    const { resources: destinations } = await containers.destinations.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId",
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();

    for (const dest of destinations) {
      await permissionsApi.grantPermission(dest.id, "destination", travellerEmail, "contributor", "trip", tripId);
    }
  } catch (error) {
    console.error("Error adding traveler to trip:", error);
    throw error;
  }
}

/**
 * Add a viewer/guest (reader) to a trip
 */
export async function addViewerToTrip(tripId: string, viewerEmail: string): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) throw new Error("Trip not found");

    // Add to trip viewers array if not already present
    if (!trip.viewers.includes(viewerEmail)) {
      trip.viewers.push(viewerEmail);
      await containers.trips.item(tripId, tripId).replace(trip);
    }

    // Grant reader permission
    await permissionsApi.grantPermission(tripId, "trip", viewerEmail, "reader");

    // Get all destinations in this trip and grant permissions
    const { resources: destinations } = await containers.destinations.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId",
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();

    for (const dest of destinations) {
      await permissionsApi.grantPermission(dest.id, "destination", viewerEmail, "reader", "trip", tripId);
    }
  } catch (error) {
    console.error("Error adding viewer to trip:", error);
    throw error;
  }
}

/**
 * Remove a traveler from a trip
 */
export async function removeTravelerFromTrip(tripId: string, travellerEmail: string): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) throw new Error("Trip not found");

    // Remove from trip people array
    trip.people = trip.people.filter((p) => p !== travellerEmail);
    await containers.trips.item(tripId, tripId).replace(trip);

    // Revoke permissions
    await permissionsApi.revokePermission(tripId, travellerEmail);

    // Get all destinations/activities in this trip and revoke permissions
    const { resources: destinations } = await containers.destinations.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId",
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();

    for (const dest of destinations) {
      await permissionsApi.revokePermission(dest.id, travellerEmail);

      // Get activities and revoke those too
      const { resources: activities } = await containers.activities.items
        .query({
          query: "SELECT * FROM c WHERE c.destinationId = @destId",
          parameters: [{ name: "@destId", value: dest.id }],
        })
        .fetchAll();

      for (const activity of activities) {
        await permissionsApi.revokePermission(activity.id, travellerEmail);
      }
    }
  } catch (error) {
    console.error("Error removing traveler from trip:", error);
    throw error;
  }
}

/**
 * Remove a viewer from a trip
 */
export async function removeViewerFromTrip(tripId: string, viewerEmail: string): Promise<void> {
  try {
    const trip = await getTrip(tripId);
    if (!trip) throw new Error("Trip not found");

    // Remove from trip viewers array
    trip.viewers = trip.viewers.filter((v) => v !== viewerEmail);
    await containers.trips.item(tripId, tripId).replace(trip);

    // Revoke permissions
    await permissionsApi.revokePermission(tripId, viewerEmail);

    // Get all destinations/activities in this trip and revoke permissions
    const { resources: destinations } = await containers.destinations.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId",
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();

    for (const dest of destinations) {
      await permissionsApi.revokePermission(dest.id, viewerEmail);

      // Get activities and revoke those too
      const { resources: activities } = await containers.activities.items
        .query({
          query: "SELECT * FROM c WHERE c.destinationId = @destId",
          parameters: [{ name: "@destId", value: dest.id }],
        })
        .fetchAll();

      for (const activity of activities) {
        await permissionsApi.revokePermission(activity.id, viewerEmail);
      }
    }
  } catch (error) {
    console.error("Error removing viewer from trip:", error);
    throw error;
  }
}
