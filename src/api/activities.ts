import { containers } from "@/lib/cosmosdb";
import { Activity } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

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
  data?: Partial<Activity>
): Promise<Activity> {
  const activity: Activity = {
    id: uuidv4(),
    name,
    destinationId,
    addedBy,
    category: data?.category || "other",
    description: data?.description,
    url: data?.url,
    estimatedCost: data?.estimatedCost,
    currency: data?.currency || "EUR",
    duration: data?.duration,
    votes: 0,
    votedBy: [],
    status: data?.status || "suggested",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await containers.activities.items.create(activity);
  console.log(`Created activity: ${activity.id} for destination ${destinationId}`);
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
