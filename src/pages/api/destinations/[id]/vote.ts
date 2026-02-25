import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "POST") {
    try {
      // Toggle vote
      const success = await destinationApi.voteForDestination(
        id as string,
        session.user.email
      );

      if (!success) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Fetch and return updated destination
      const updatedDestination = await destinationApi.getDestination(id as string);
      if (!updatedDestination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      return res.status(200).json(updatedDestination);
    } catch (error) {
      console.error("Vote error:", error);
      return res.status(500).json({ error: "Failed to vote" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
