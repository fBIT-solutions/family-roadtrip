import { containers } from "@/lib/cosmosdb";
import { Trip, TripSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export async function createTrip(
  data: Omit<Trip, "id" | "createdAt" | "updatedAt" | "days">
): Promise<Trip> {
  // Calculate days from date range
  const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const trip: Trip = {
    ...data,
    id: uuidv4(),
    days,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.trips.items.create(trip);
    return trip;
  } catch (error) {
    console.error("Error creating trip:", error);
    throw new Error("Failed to create trip");
  }
}

export async function getTrips(createdBy?: string): Promise<Trip[]> {
  try {
    let query = "SELECT * FROM c ORDER BY c.startDate DESC";
    const parameters: any[] = [];

    if (createdBy) {
      query = "SELECT * FROM c WHERE c.createdBy = @createdBy ORDER BY c.startDate DESC";
      parameters.push({ name: "@createdBy", value: createdBy });
    }

    const { resources } = await containers.trips.items
      .query({
        query,
        parameters,
      })
      .fetchAll();

    console.log(`Fetched ${resources.length} trips`);
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
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      days,
    };

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

export async function getTripWithStats(id: string) {
  try {
    const trip = await getTrip(id);
    if (!trip) return null;

    // Get destinations for this trip
    const { resources: destinations } = await containers.destinations.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId",
        parameters: [{ name: "@tripId", value: id }],
      })
      .fetchAll();

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
