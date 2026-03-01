import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as timelineApi from "@/api/timeline";
import * as permissionsApi from "@/api/itemPermissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email || "";
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const canView = await permissionsApi.canViewItem(id as string, userEmail);
      if (!canView) {
        return res.status(403).json({ error: "You do not have access to this timeline event" });
      }

      const event = await timelineApi.getTimelineEvent(id as string);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  } else if (req.method === "PUT") {
    try {
      const canEdit = await permissionsApi.canEditItem(id as string, userEmail);
      if (!canEdit) {
        return res.status(403).json({ error: "You do not have permission to edit this timeline event" });
      }

      const event = await timelineApi.updateTimelineEvent(id as string, req.body);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  } else if (req.method === "DELETE") {
    try {
      const isOwner = await permissionsApi.isOwner(id as string, userEmail);
      if (!isOwner) {
        return res.status(403).json({ error: "Only owner can delete this timeline event" });
      }

      const success = await timelineApi.deleteTimelineEvent(id as string);
      if (!success) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
