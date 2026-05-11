import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as itemReferencesApi from "@/api/itemReferences";
import * as tripsApi from "@/api/trips";

/**
 * Handle updates to destination references (user-specific linked destinations)
 * GET: Fetch a reference
 * PUT: Update a reference (status, notes, etc.)
 * DELETE: Remove a reference from a trip
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email || "";
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch the reference
      const reference = await itemReferencesApi.getItemReferencesByUser(userEmail);
      const found = reference.find((r) => r.id === id);

      if (!found) {
        return res.status(404).json({ error: "Reference not found" });
      }

      res.status(200).json(found);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reference" });
    }
  } else if (req.method === "PUT") {
    try {
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch the reference to verify ownership
      const allReferences = await itemReferencesApi.getItemReferencesByUser(userEmail);
      const reference = allReferences.find((r) => r.id === id);

      if (!reference) {
        return res.status(404).json({ error: "Reference not found" });
      }

      // Verify user is the one who created this reference
      if (reference.userId !== userEmail) {
        return res.status(403).json({ error: "You do not have permission to update this reference" });
      }

      // Verify user still has access to the trip (if updating status)
      if (req.body.status && reference.tripId) {
        const trip = await tripsApi.getTrip(reference.tripId);
        if (!trip || !trip.people.includes(userEmail)) {
          return res.status(403).json({ error: "You no longer have access to this trip" });
        }
      }

      // Update the reference
      const updated = await itemReferencesApi.updateItemReference(id as string, {
        status: req.body.status,
        notes: req.body.notes,
      });

      if (!updated) {
        return res.status(404).json({ error: "Failed to update reference" });
      }

      res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating destination reference:", error);
      res.status(500).json({ error: "Failed to update reference" });
    }
  } else if (req.method === "DELETE") {
    try {
      if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch the reference to verify ownership
      const allReferences = await itemReferencesApi.getItemReferencesByUser(userEmail);
      const reference = allReferences.find((r) => r.id === id);

      if (!reference) {
        return res.status(404).json({ error: "Reference not found" });
      }

      // Verify user is the one who created this reference
      if (reference.userId !== userEmail) {
        return res.status(403).json({ error: "You do not have permission to delete this reference" });
      }

      // Delete the reference
      await itemReferencesApi.deleteItemReference(id as string);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting destination reference:", error);
      res.status(500).json({ error: "Failed to delete reference" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
