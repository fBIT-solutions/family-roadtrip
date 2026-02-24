import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
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
    const interests = await extractUserInterests(userId);

    // Get recommendations from Vertex AI
    const recommendations = await recommendActivities(
      destination,
      interests,
      budget || 50,
      currency,
      userId
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
