import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { containers } from "@/lib/cosmosdb";
import { RecommendationDislike } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow authenticated requests
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user.email;
  
  // Get user ID
  const { resources: users } = await containers.users.items
    .query({
      query: "SELECT c.id FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: userEmail }],
    })
    .fetchAll();

  const userId = users?.[0]?.id;
  if (!userId) {
    return res.status(404).json({ error: "User not found" });
  }

  if (req.method === "POST") {
    try {
      const { type, recommendationId, name, category, reason, tags } = req.body;

      // Validate required fields
      if (!type || !recommendationId || !name) {
        return res.status(400).json({
          error: "type, recommendationId, and name are required",
        });
      }

      if (!["activity", "destination"].includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      // Create dislike record
      const dislike: RecommendationDislike = {
        id: uuidv4(),
        userId,
        type,
        recommendationId,
        name,
        category: category || undefined,
        reason: reason || undefined,
        tags: tags || [],
        createdAt: new Date(),
      };

      await containers.recommendationDislikes.items.create(dislike);

      return res.status(201).json({
        success: true,
        message: `Marked "${name}" as disliked`,
        dislike,
      });
    } catch (error) {
      console.error("Error recording dislike:", error);
      return res.status(500).json({ error: "Failed to record dislike" });
    }
  }

  if (req.method === "GET") {
    try {
      // Get all dislikes for this user
      const { resources } = await containers.recommendationDislikes.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();

      return res.status(200).json({
        count: resources.length,
        dislikes: resources,
      });
    } catch (error) {
      console.error("Error fetching dislikes:", error);
      return res.status(500).json({ error: "Failed to fetch dislikes" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { dislikeId } = req.body;
      if (!dislikeId) {
        return res.status(400).json({ error: "dislikeId is required" });
      }

      // Check ownership
      const { resource: dislike } = await containers.recommendationDislikes
        .item(dislikeId, dislikeId)
        .read();

      if ((dislike as any)?.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await containers.recommendationDislikes.item(dislikeId, dislikeId).delete();

      return res.status(200).json({ success: true, message: "Dislike removed" });
    } catch (error) {
      console.error("Error deleting dislike:", error);
      return res.status(500).json({ error: "Failed to delete dislike" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
