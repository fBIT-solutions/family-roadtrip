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
  console.log("[preferences] Request received:", req.method);
  
  try {
    // Only allow authenticated requests
    const session = await getServerSession(req, res, authOptions);
    console.log("[preferences] Session:", session?.user?.email ? "Authenticated" : "Not authenticated");
    
    if (!session?.user?.email) {
      console.log("[preferences] No session, returning 401");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userEmail = session.user.email;
    console.log("[preferences] Processing for user:", userEmail);

    // Get user ID
    console.log("[preferences] Querying for user by email...");
    let { resources: users } = await containers.users.items
      .query({
        query: "SELECT c.id FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: userEmail }],
      })
      .fetchAll();

    console.log("[preferences] Found users:", users?.length);
    let userId = users?.[0]?.id;
    
    // If user doesn't exist, create them
    if (!userId) {
      console.log("[preferences] User not found, creating new user...");
      userId = uuidv4();
      const newUser = {
        id: userId,
        email: userEmail,
        name: session.user.name || userEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await containers.users.items.create(newUser);
      console.log("[preferences] User created with ID:", userId);
    }

    console.log("[preferences] User ID:", userId);

    if (req.method === "GET") {
      console.log("[preferences] Processing GET request");
      // Get user preferences
      const { resources } = await containers.userPreferences.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();

      console.log("[preferences] Found preferences:", resources?.length);
      const preferences = resources?.[0] as UserPreferences | undefined;

      if (!preferences) {
        console.log("[preferences] No preferences found, returning defaults");
        // Return default preferences if none exist
        return res.status(200).json({
          userId,
          interests: [],
          dislikes: [],
          cuisinePreferences: [],
        });
      }

      console.log("[preferences] Returning existing preferences");
      return res.status(200).json(preferences);
    }

    if (req.method === "POST" || req.method === "PUT") {
      console.log("[preferences] Processing POST/PUT request");
      const { interests, dislikes, cuisinePreferences, travelPace, budgetSensitivity } =
        req.body;

      // Check if preferences exist
      const { resources: existing } = await containers.userPreferences.items
        .query({
          query: "SELECT c.id FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();

      const existingPrefs = existing?.[0] as any;
      const now = new Date();

      console.log("[preferences] Existing prefs:", existingPrefs ? "Found" : "Not found");

      // Build preferences object - allow partial updates
      const preferences: UserPreferences = {
        id: existingPrefs?.id || uuidv4(),
        userId,
        // Use provided values if they exist (including empty arrays), otherwise keep existing
        interests: interests !== undefined ? interests : (existingPrefs?.interests || []),
        dislikes: dislikes !== undefined ? dislikes : (existingPrefs?.dislikes || []),
        cuisinePreferences: cuisinePreferences !== undefined ? cuisinePreferences : (existingPrefs?.cuisinePreferences || []),
        travelPace: travelPace !== undefined ? travelPace : existingPrefs?.travelPace,
        budgetSensitivity: budgetSensitivity !== undefined ? budgetSensitivity : existingPrefs?.budgetSensitivity,
        createdAt: existingPrefs?.createdAt || now,
        updatedAt: now,
      };

      if (existingPrefs) {
        console.log("[preferences] Updating existing preferences");
        // Update existing
        await containers.userPreferences
          .item(existingPrefs.id, existingPrefs.id)
          .replace(preferences);
      } else {
        console.log("[preferences] Creating new preferences");
        // Create new
        await containers.userPreferences.items.create(preferences);
      }

      console.log("[preferences] Preferences saved successfully");
      return res.status(200).json({
        success: true,
        preferences,
      });
    }

    console.log("[preferences] Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[preferences] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: String(error),
    });
  }
}