import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/authConfig";
import * as feedApi from "@/api/feed";
import * as tripsApi from "@/api/trips";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Trip ID is required" });
  }

  // Verify trip exists
  try {
    const trip = await tripsApi.getTrip(id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
  } catch (error) {
    console.error("Error verifying trip:", error);
    return res.status(500).json({ error: "Failed to verify trip" });
  }

  if (req.method === "GET") {
    try {
      const posts = await feedApi.getFeedPostsByTripId(id);
      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching feed posts:", error);
      res.status(500).json({ error: "Failed to fetch feed posts" });
    }
  } else if (req.method === "POST") {
    try {
      const { content } = req.body;

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      if (content.length > 5000) {
        return res.status(400).json({ error: "Content is too long (max 5000 characters)" });
      }

      const post = await feedApi.createFeedPost(
        id,
        content.trim(),
        session.user.name || session.user.email,
        session.user.email
      );

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating feed post:", error);
      res.status(500).json({ error: "Failed to create feed post" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
