import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/authConfig";
import { recommendActivities, extractUserInterests } from "@/api/ai";
import { containers } from "@/lib/cosmosdb";
import { Destination } from "@/types/schema";

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

    const { destinationId, budget, currency = "EUR" } = req.body;

    if (!destinationId) {
      return res.status(400).json({ error: "destinationId is required" });
    }

    // Fetch the destination
    let destination: Destination | null = null;
    try {
      const { resource } = await containers.destinations.item(destinationId, destinationId).read();
      destination = resource as Destination;
    } catch (error) {
      return res.status(404).json({ error: "Destination not found" });
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

    // Extract user interests from their voted activities
    let interests = await extractUserInterests(userId);

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
        // Merge preferences with voting history interests
        if (userPreferences.interests && userPreferences.interests.length > 0) {
          interests = [...new Set([...interests, ...userPreferences.interests])];
        }
      }
    } catch (error) {
      console.log("Could not fetch user preferences, continuing with voting history");
    }

    // Fetch existing activities for this destination to exclude them from recommendations
    let existingActivityNames: string[] = [];
    try {
      const { resources: activities } = await containers.activities.items
        .query({
          query: "SELECT c.name FROM c WHERE c.destinationId = @destId AND c.status IN ('planned', 'completed')",
          parameters: [{ name: "@destId", value: destinationId }],
        })
        .fetchAll();
      existingActivityNames = (activities || []).map((a: any) => a.name);
    } catch (error) {
      console.log("Could not fetch existing activities for exclusion, continuing");
    }

    // Get recommendations from Vertex AI
    const recommendations = await recommendActivities(
      destination,
      interests,
      budget || 50,
      currency,
      userId,
      { ...userPreferences, existingActivityNames }
    );

    return res.status(200).json({
      success: true,
      destination: {
        id: destination.id,
        name: destination.name,
        country: destination.country,
      },
      userInterests: interests,
      recommendationCount: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Error in activity recommendations endpoint:", error);
    return res.status(500).json({
      error: "Failed to generate recommendations",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
