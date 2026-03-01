import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import * as activitiesApi from "@/api/activities";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email;
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid activity ID" });
  }

  if (req.method === "PATCH") {
    const { isPublic } = req.body;

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ error: "isPublic must be a boolean" });
    }

    try {
      const activity = await activitiesApi.getActivity(id);

      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }

      // Only the creator can make an activity public
      if (activity.addedBy !== userEmail) {
        return res.status(403).json({ error: "You can only make your own activities public" });
      }

      // Update the public status
      activity.public = isPublic;
      activity.updatedAt = new Date();

      // Save the updated activity
      const container = await activitiesApi.getActivitiesContainer();
      await container.items.upsert(activity);

      return res.status(200).json({ success: true, activity });
    } catch (error) {
      console.error("Error updating activity public status:", error);
      return res.status(500).json({ error: "Failed to update activity public status" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
