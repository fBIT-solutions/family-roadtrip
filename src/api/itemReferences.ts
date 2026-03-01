import { containers } from "@/lib/cosmosdb";
import { ItemReference, Destination, Activity } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export async function createDestinationReference(
  originalItemId: string,
  originalCreatorId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    place?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    mainPhotoUrl?: string;
  },
  tripId?: string
): Promise<ItemReference> {
  const reference: ItemReference = {
    id: uuidv4(),
    type: "destination",
    originalItemId,
    originalCreatorId,
    userId,
    tripId,
    name: data.name,
    description: data.description,
    place: data.place,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
    mainPhotoUrl: data.mainPhotoUrl,
    status: "proposed", // Default status for referenced item
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await containers.itemReferences.items.create(reference);
  return reference;
}

export async function createActivityReference(
  originalItemId: string,
  originalCreatorId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    destinationId?: string;
    category?: string;
    url?: string;
    estimatedCost?: number;
    duration?: string;
  },
  tripId?: string
): Promise<ItemReference> {
  const reference: ItemReference = {
    id: uuidv4(),
    type: "activity",
    originalItemId,
    originalCreatorId,
    userId,
    tripId,
    name: data.name,
    description: data.description,
    destinationId: data.destinationId,
    status: "suggested", // Default status for referenced activity
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await containers.itemReferences.items.create(reference);
  return reference;
}

export async function getItemReferencesByUser(userId: string): Promise<ItemReference[]> {
  try {
    const { resources } = await containers.itemReferences.items
      .query({
        query: "SELECT * FROM c WHERE c.userId = @userId",
        parameters: [{ name: "@userId", value: userId }],
      })
      .fetchAll();
    return resources as ItemReference[];
  } catch (error) {
    console.error("Error fetching item references for user:", error);
    return [];
  }
}

export async function getItemReferencesByTrip(tripId: string): Promise<ItemReference[]> {
  try {
    const { resources } = await containers.itemReferences.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId",
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();
    return resources as ItemReference[];
  } catch (error) {
    console.error("Error fetching item references for trip:", error);
    return [];
  }
}

export async function getItemReferencesByUserAndTrip(
  userId: string,
  tripId: string
): Promise<ItemReference[]> {
  try {
    const { resources } = await containers.itemReferences.items
      .query({
        query: "SELECT * FROM c WHERE c.userId = @userId AND c.tripId = @tripId",
        parameters: [
          { name: "@userId", value: userId },
          { name: "@tripId", value: tripId },
        ],
      })
      .fetchAll();
    return resources as ItemReference[];
  } catch (error) {
    console.error("Error fetching item references:", error);
    return [];
  }
}

export async function deleteItemReference(referenceId: string): Promise<void> {
  try {
    await containers.itemReferences.item(referenceId, referenceId).delete();
  } catch (error) {
    console.error("Error deleting item reference:", error);
  }
}

export async function updateItemReference(
  referenceId: string,
  updates: Partial<ItemReference>
): Promise<ItemReference | null> {
  try {
    const existing = await containers.itemReferences.item(referenceId, referenceId).read();
    if (!existing.resource) return null;

    const updated = {
      ...(existing.resource as ItemReference),
      ...updates,
      id: existing.resource.id,
      createdAt: (existing.resource as ItemReference).createdAt,
      updatedAt: new Date(),
    };

    const result = await containers.itemReferences.item(referenceId, referenceId).replace(updated);
    return result.resource as ItemReference;
  } catch (error) {
    console.error("Error updating item reference:", error);
    return null;
  }
}

export async function getItemReferencesContainer() {
  return containers.itemReferences;
}
