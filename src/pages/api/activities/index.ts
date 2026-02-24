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

  if (req.method === "GET") {
    const { destinationId } = req.query;

    try {
      if (destinationId) {
        const activities = await activitiesApi.getActivitiesByDestination(destinationId as string);
        return res.status(200).json(activities);
      } else {
        const activities = await activitiesApi.getActivities();
        return res.status(200).json(activities);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      return res.status(500).json({ error: "Failed to fetch activities" });
    }
  }

  if (req.method === "POST") {
    const { name, destinationId, category, description, url, estimatedCost, duration, status } = req.body;

    if (!name || !destinationId) {
      return res.status(400).json({ error: "Missing required fields: name, destinationId" });
    }

    try {
      const activity = await activitiesApi.createActivity(name, destinationId, session.user?.email || "", {
        category,
        description,
        url,
        estimatedCost,
        duration,
        status,
      });
      return res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      return res.status(500).json({ error: "Failed to create activity" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;

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
