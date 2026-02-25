import { containers } from "@/lib/cosmosdb";
import { Destination, DestinationSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export async function createDestination(
  data: Omit<Destination, "id" | "createdAt" | "updatedAt" | "votes" | "votedBy">
): Promise<Destination> {
  const destination: Destination = {
    ...data,
    id: uuidv4(),
    votes: 0,
    votedBy: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.destinations.items.create(destination);
    return destination;
  } catch (error) {
    console.error("Error creating destination:", error);
    throw new Error("Failed to create destination");
  }
}

export async function getDestinations(): Promise<Destination[]> {
  try {
    const { resources } = await containers.destinations.items
      .query("SELECT * FROM c ORDER BY c.votes DESC")
      .fetchAll();

    console.log(`Fetched ${resources.length} destinations from database`);
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
    console.error("Error fetching destinations:", error);
    throw error;
  }
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
