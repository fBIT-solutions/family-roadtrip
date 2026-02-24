import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/authConfig";
import { containers } from "@/lib/cosmosdb";
import { UserPreferences } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
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

    if (req.method === "GET") {
      // Get user preferences
      const { resources } = await containers.userPreferences.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();

      const preferences = resources?.[0] as UserPreferences | undefined;

      if (!preferences) {
        // Return default preferences if none exist
        return res.status(200).json({
          userId,
          interests: [],
          dislikes: [],
          cuisinePreferences: [],
        });
      }

      return res.status(200).json(preferences);
    }

    if (req.method === "POST" || req.method === "PUT") {
      const { interests, dislikes, cuisinePreferences, travelPace, budgetSensitivity } =
        req.body;

      // Validate input
      if (
        !interests &&
        !dislikes &&
        !cuisinePreferences &&
        !travelPace &&
        !budgetSensitivity
      ) {
        return res
          .status(400)
          .json({ error: "At least one preference field is required" });
      }

      // Check if preferences exist
      const { resources: existing } = await containers.userPreferences.items
        .query({
          query: "SELECT c.id FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();

      const existingPrefs = existing?.[0] as any;
      const now = new Date();

      const preferences: UserPreferences = {
        id: existingPrefs?.id || uuidv4(),
        userId,
        interests: interests || existingPrefs?.interests || [],
        dislikes: dislikes || existingPrefs?.dislikes || [],
        cuisinePreferences: cuisinePreferences || existingPrefs?.cuisinePreferences || [],
        travelPace: travelPace || existingPrefs?.travelPace,
        budgetSensitivity: budgetSensitivity || existingPrefs?.budgetSensitivity,
        createdAt: existingPrefs?.createdAt || now,
        updatedAt: now,
      };

      if (existingPrefs) {
        // Update existing
        await containers.userPreferences
          .item(existingPrefs.id, existingPrefs.id)
          .replace(preferences);
      } else {
        // Create new
        await containers.userPreferences.items.create(preferences);
      }

      return res.status(200).json({
        success: true,
        preferences,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("API /api/user/preferences error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: String(error),
    });
  }
}