import { containers } from "@/lib/cosmosdb";
import { TimelineEvent, TimelineEventSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export async function createTimelineEvent(
  data: Omit<TimelineEvent, "id" | "createdAt" | "updatedAt">
): Promise<TimelineEvent> {
  const event: TimelineEvent = {
    ...data,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.timeline.items.create(event);
    return event;
  } catch (error) {
    console.error("Error creating timeline event:", error);
    throw new Error("Failed to create timeline event");
  }
}

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  try {
    const { resources } = await containers.timeline.items
      .query("SELECT * FROM c ORDER BY c.date ASC")
      .fetchAll();

    return resources.map((r: any) => TimelineEventSchema.parse(r));
  } catch (error) {
    console.error("Error fetching timeline events:", error);
    return [];
  }
}

export async function getTimelineEvent(id: string): Promise<TimelineEvent | null> {
  try {
    const { resources } = await containers.timeline.items
      .query({
        query: `SELECT * FROM c WHERE c.id = @id`,
        parameters: [{ name: "@id", value: id }],
      })
      .fetchAll();

    if (resources.length === 0) return null;
    return TimelineEventSchema.parse(resources[0]);
  } catch (error) {
    console.error("Error fetching timeline event:", error);
    return null;
  }
}

export async function updateTimelineEvent(
  id: string,
  data: Partial<TimelineEvent>
): Promise<TimelineEvent | null> {
  try {
    const existing = await getTimelineEvent(id);
    if (!existing) return null;

    const updated: TimelineEvent = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    const { resource } = await containers.timeline.item(id, id).replace(updated);
    return resource ? TimelineEventSchema.parse(resource) : null;
  } catch (error) {
    console.error("Error updating timeline event:", error);
    return null;
  }
}

export async function deleteTimelineEvent(id: string): Promise<boolean> {
  try {
    const timelineEvent = await getTimelineEvent(id);
    if (!timelineEvent) return false;
    
    await containers.timeline.item(id, id).delete();
    return true;
  } catch (error) {
    console.error("Error deleting timeline event:", error);
    return false;
  }
}
