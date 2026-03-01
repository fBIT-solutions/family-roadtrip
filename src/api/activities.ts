import { containers } from "@/lib/cosmosdb";
import { Activity } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";
import * as permissionsApi from "./itemPermissions";
import * as destinationsApi from "./destinations";
import * as tripsApi from "./trips";

/**
 * Get activities that a user can see:
 * 1. Activities they created (addedBy = userId)
 * 2. Activities in trips they are part of (creator, traveler, or viewer)
 * 3. Public activities from other users
 */
export async function getActivitiesForUser(
  userId: string,
  userTripIds: string[] = []
): Promise<Activity[]> {
  try {
    // Get activities user created or are in their trips
    let query = "SELECT * FROM c WHERE c.addedBy = @userId";
    const parameters: any[] = [{ name: "@userId", value: userId }];

    // Add activities from user's trips if any
    if (userTripIds.length > 0) {
      const placeholders = userTripIds.map((_, i) => `@tripId${i}`).join(",");
      query += ` OR c.tripId IN (${placeholders})`;
      userTripIds.forEach((tripId, i) => {
        parameters.push({ name: `@tripId${i}`, value: tripId });
      });
    }

    // Add public activities (visible to everyone)
    query += ` OR c.public = true`;
    query += ` ORDER BY c.createdAt DESC`;

    const { resources } = await containers.activities.items
      .query({
        query,
        parameters,
      })
      .fetchAll();

    return resources as Activity[];
  } catch (error) {
    console.error("Error fetching activities for user:", error);
    return [];
  }
}

/**
 * Legacy function: Get all activities (for backward compatibility)
 */
export async function getActivities(): Promise<Activity[]> {
  try {
    const { resources } = await containers.activities.items
      .query("SELECT * FROM c ORDER BY c.createdAt DESC")
      .fetchAll();
    return resources as Activity[];
  } catch (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
}

export async function getActivitiesByDestination(destinationId: string): Promise<Activity[]> {
  try {
    const { resources } = await containers.activities.items
      .query({
        query: "SELECT * FROM c WHERE c.destinationId = @destId",
        parameters: [{ name: "@destId", value: destinationId }],
      })
      .fetchAll();
    return resources as Activity[];
  } catch (error) {
    console.error("Error fetching activities for destination:", error);
    return [];
  }
}

export async function getActivityById(id: string): Promise<Activity | null> {
  try {
    const { resource } = await containers.activities.item(id, id).read();
    return resource as Activity;
  } catch (error) {
    console.error("Error fetching activity:", error);
    return null;
  }
}

export async function createActivity(
  name: string,
  destinationId: string,
  addedBy: string,
  data?: Partial<Activity>,
  tripId?: string
): Promise<Activity> {
  const activity: Activity = {
    id: uuidv4(),
    name,
    destinationId,
    tripId,
    addedBy,
    category: data?.category || "other",
    description: data?.description,
    url: data?.url,
    estimatedCost: data?.estimatedCost,
    currency: data?.currency || "EUR",
    duration: data?.duration,
    votes: 1,
    votedBy: [addedBy],
    status: data?.status || "suggested",
    eventIds: [],
    public: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await containers.activities.items.create(activity);
  console.log(`Created activity: ${activity.id} for destination ${destinationId}`);
  
  // Grant permissions to activity
  try {
    // Creator gets owner permission
    await permissionsApi.grantPermission(
      activity.id,
      "activity",
      addedBy,
      "owner",
      "destination",
      destinationId
    );
    
    // If we have tripId, grant permissions to trip members
    let finalTripId = tripId;
    if (!finalTripId) {
      const destination = await destinationsApi.getDestination(destinationId);
      finalTripId = destination?.tripId;
    }
    
    if (finalTripId) {
      const trip = await tripsApi.getTrip(finalTripId);
      if (trip) {
        // Grant contributor access to travelers
        for (const email of trip.people) {
          if (email !== addedBy) {
            await permissionsApi.grantPermission(
              activity.id,
              "activity",
              email,
              "contributor",
              "destination",
              destinationId
            );
          }
        }
        
        // Grant reader access to viewers
        for (const email of trip.viewers) {
          if (email !== addedBy) {
            await permissionsApi.grantPermission(
              activity.id,
              "activity",
              email,
              "reader",
              "destination",
              destinationId
            );
          }
        }
      }
    }
  } catch (permError) {
    console.error("Error granting permissions for activity:", permError);
    // Don't fail if permission grant fails - activity is still created
  }
  
  return activity;
}

export async function updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
  const existing = await getActivityById(id);

  if (!existing) {
    throw new Error("Activity not found");
  }

  const updated: Activity = {
    ...existing,
    ...updates,
    id: existing.id,
    destinationId: existing.destinationId,
    addedBy: existing.addedBy,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  await containers.activities.item(id, id).replace(updated);
  console.log(`Updated activity: ${id}`);
  return updated;
}

export async function deleteActivity(id: string): Promise<void> {
  await containers.activities.item(id, id).delete();
  console.log(`Deleted activity: ${id}`);
}

export async function voteActivity(id: string, userId: string): Promise<Activity> {
  const activity = await getActivityById(id);

  if (!activity) {
    throw new Error("Activity not found");
  }

  // Toggle vote
  const hasVoted = activity.votedBy.includes(userId);
  const updatedVotedBy = hasVoted
    ? activity.votedBy.filter((id) => id !== userId)
    : [...activity.votedBy, userId];

  const updated: Activity = {
    ...activity,
    votes: updatedVotedBy.length,
    votedBy: updatedVotedBy,
    updatedAt: new Date(),
  };

  await containers.activities.item(id, id).replace(updated);
  return updated;
}

export async function getActivitiesByStatus(status: string): Promise<Activity[]> {
  try {
    const { resources } = await containers.activities.items
      .query({
        query: "SELECT * FROM c WHERE c.status = @status ORDER BY c.votes DESC",
        parameters: [{ name: "@status", value: status }],
      })
      .fetchAll();
    return resources as Activity[];
  } catch (error) {
    console.error("Error fetching activities by status:", error);
    return [];
  }
}

export async function updateActivityStatus(
  id: string,
  status: "suggested" | "planned" | "completed" | "cancelled"
): Promise<Activity> {
  return updateActivity(id, { status });
}

export async function getActivity(id: string): Promise<Activity | null> {
  return getActivityById(id);
}

export async function getActivitiesContainer() {
  return containers.activities;
}
