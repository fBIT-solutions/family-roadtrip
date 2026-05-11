import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import * as itemReferencesApi from "@/api/itemReferences";

/**
 * GET /api/destination-references?tripId=X
 * Fetch all destination references for a specific trip (visited destinations)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userEmail = session.user?.email || "";
    const { tripId } = req.query;

    if (!tripId || typeof tripId !== "string") {
      return res.status(400).json({ error: "tripId query parameter required" });
    }

    // Get all references for this user
    const references = await itemReferencesApi.getItemReferencesByUser(userEmail);

    // Filter to only those in the specified trip
    const tripReferences = references.filter((ref) => ref.tripId === tripId);

    res.status(200).json({ references: tripReferences });
  } catch (error) {
    console.error("Error fetching destination references:", error);
    res.status(500).json({ error: "Failed to fetch destination references" });
  }
}
