import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
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

    // Get recommendations from Vertex AI
    const recommendations = await recommendDestinations(
      interests,
      budget,
      currency,
      tripDurationDays,
      userId,
      tripDurationMin,
      tripDurationMax
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
