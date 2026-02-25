import { containers } from "@/lib/cosmosdb";
import { v4 as uuidv4 } from "uuid";

export interface FeedPost {
  id: string;
  tripId: string;
  content: string;
  author: string;
  authorEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createFeedPost(
  tripId: string,
  content: string,
  author: string,
  authorEmail: string
): Promise<FeedPost> {
  const post: FeedPost = {
    id: uuidv4(),
    tripId,
    content,
    author,
    authorEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.feed.items.create(post);
    return post;
  } catch (error) {
    console.error("Error creating feed post:", error);
    throw new Error("Failed to create feed post");
  }
}

export async function getFeedPostsByTripId(tripId: string): Promise<FeedPost[]> {
  try {
    const { resources } = await containers.feed.items
      .query({
        query: "SELECT * FROM c WHERE c.tripId = @tripId ORDER BY c.createdAt DESC",
        parameters: [{ name: "@tripId", value: tripId }],
      })
      .fetchAll();

    return resources.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    })) as FeedPost[];
  } catch (error) {
    console.error("Error fetching feed posts:", error);
    throw new Error("Failed to fetch feed posts");
  }
}

export async function deleteFeedPost(postId: string): Promise<void> {
  try {
    await containers.feed.item(postId).delete();
  } catch (error) {
    console.error("Error deleting feed post:", error);
    throw new Error("Failed to delete feed post");
  }
}
