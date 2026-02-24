import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/authConfig";
import { recommendDestinations, extractUserInterests } from "@/api/ai";
import { containers } from "@/lib/cosmosdb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      budget,
      currency = "EUR",
      tripDurationDays = 14,
      tripDurationMin = 1,
      tripDurationMax = 3,
      interests: providedInterests,
    } = req.body;

    if (!budget || budget <= 0) {
      return res.status(400).json({ error: "Valid budget is required" });
    }

    // Get user ID from session
    const userEmail = session.user.email;
    const { resources: users } = await containers.users.items
      .query({
        query: "SELECT c.id FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: userEmail }],
      })
      .fetchAll();

    const userId = users?.[0]?.id || userEmail;

    // Use provided interests or extract from user's voting history
    let interests = providedInterests || [];
    if (interests.length === 0) {
      interests = await extractUserInterests(userId);
    }

    // Fetch user preferences to include in recommendations
    let userPreferences: any = {};
    try {
      const { resources: prefs } = await containers.userPreferences.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @userId",
          parameters: [{ name: "@userId", value: userId }],
        })
        .fetchAll();

      if (prefs && prefs.length > 0) {
        userPreferences = prefs[0];
        // Merge preferences with provided interests
        if (userPreferences.interests && userPreferences.interests.length > 0) {
          interests = [...new Set([...interests, ...userPreferences.interests])];
        }
      }
    } catch (error) {
      console.log("Could not fetch user preferences, continuing with voting history");
    }

    // Fetch existing destinations to exclude them from recommendations
    let existingDestinations: any[] = [];
    try {
      const { resources: dests } = await containers.destinations.items
        .query("SELECT c.name, c.country FROM c WHERE c.status IN ('proposed', 'accepted', 'planned')")
        .fetchAll();
      existingDestinations = dests || [];
    } catch (error) {
      console.log("Could not fetch existing destinations for exclusion, continuing");
    }

    // Get recommendations from Vertex AI
    const recommendations = await recommendDestinations(
      interests,
      budget,
      currency,
      tripDurationDays,
      userId,
      tripDurationMin,
      tripDurationMax,
      { ...userPreferences, existingDestinations }
    );

    return res.status(200).json({
      success: true,
      tripDuration: `${tripDurationDays} days`,
      totalBudget: budget,
      currency,
      userInterests: interests,
      recommendationCount: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Error in destination recommendations endpoint:", error);
    return res.status(500).json({
      error: "Failed to generate recommendations",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
