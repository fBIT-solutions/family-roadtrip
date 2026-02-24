import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import * as activitiesApi from "@/api/activities";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, action } = req.query;

  if (req.method === "GET") {
    try {
      const activity = await activitiesApi.getActivityById(id as string);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      return res.status(200).json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }
  }

  if (req.method === "PUT") {
    if (action === "vote") {
      try {
        const activity = await activitiesApi.voteActivity(id as string, session.user?.email || "");
        return res.status(200).json(activity);
      } catch (error) {
        console.error("Error voting on activity:", error);
        return res.status(500).json({ error: "Failed to vote" });
      }
    }

    if (action === "status") {
      const { status } = req.body;
      try {
        const activity = await activitiesApi.updateActivityStatus(
          id as string,
          status as any
        );
        return res.status(200).json(activity);
      } catch (error) {
        console.error("Error updating activity status:", error);
        return res.status(500).json({ error: "Failed to update status" });
      }
    }

    // Generic update
    try {
      const activity = await activitiesApi.updateActivity(id as string, req.body);
      return res.status(200).json(activity);
    } catch (error) {
      console.error("Error updating activity:", error);
      return res.status(500).json({ error: "Failed to update activity" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await activitiesApi.deleteActivity(id as string);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting activity:", error);
      return res.status(500).json({ error: "Failed to delete activity" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
