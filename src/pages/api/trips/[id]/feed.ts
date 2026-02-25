import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/authConfig";
import * as feedApi from "@/api/feed";
import * as tripsApi from "@/api/trips";
import { canViewTripFeed, canPostToTripFeed } from "@/lib/auth-helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const userEmail = session.user.email;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Trip ID is required" });
  }

  // Verify trip exists and user has access
  let trip;
  try {
    trip = await tripsApi.getTrip(id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }
  } catch (error) {
    console.error("Error verifying trip:", error);
    return res.status(500).json({ error: "Failed to verify trip" });
  }

  if (req.method === "GET") {
    try {
      // Check if user can view trip feed
      if (!canViewTripFeed(trip, userEmail)) {
        return res.status(403).json({ error: "Access denied to this trip's feed" });
      }

      const posts = await feedApi.getFeedPostsByTripId(id);
      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching feed posts:", error);
      res.status(500).json({ error: "Failed to fetch feed posts" });
    }
  } else if (req.method === "POST") {
    try {
      // Check if user can post to trip feed
      if (!canPostToTripFeed(trip, userEmail)) {
        return res.status(403).json({ error: "You cannot post to this trip's feed" });
      }

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
        userEmail
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
