import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  if (req.method === "GET") {
    try {
      const destination = await destinationApi.getDestination(id as string);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }
      res.status(200).json(destination);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destination" });
    }
  } else if (req.method === "PUT") {
    try {
      const destination = await destinationApi.updateDestination(id as string, req.body);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }
      res.status(200).json(destination);
    } catch (error) {
      res.status(500).json({ error: "Failed to update destination" });
    }
  } else if (req.method === "DELETE") {
    try {
      const success = await destinationApi.deleteDestination(id as string);
      if (!success) {
        return res.status(404).json({ error: "Destination not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete destination" });
    }
  } else if (req.method === "POST" && action === "vote") {
    try {
      const success = await destinationApi.voteForDestination(
        id as string,
        session.user?.email || ""
      );
      if (!success) {
        return res.status(404).json({ error: "Destination not found" });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ error: "Failed to vote" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
