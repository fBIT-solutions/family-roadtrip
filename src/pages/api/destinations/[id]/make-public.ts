import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import * as destinationsApi from "@/api/destinations";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email;
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid destination ID" });
  }

  if (req.method === "PATCH") {
    const { isPublic } = req.body;

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ error: "isPublic must be a boolean" });
    }

    try {
      const destination = await destinationsApi.getDestination(id);

      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Only the creator can make a destination public
      if (destination.addedBy !== userEmail) {
        return res.status(403).json({ error: "You can only make your own destinations public" });
      }

      // Update the public status
      destination.public = isPublic;
      destination.updatedAt = new Date();

      // Save the updated destination
      const container = await destinationsApi.getDestinationsContainer();
      await container.items.upsert(destination);

      return res.status(200).json({ success: true, destination });
    } catch (error) {
      console.error("Error updating destination public status:", error);
      return res.status(500).json({ error: "Failed to update destination public status" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
