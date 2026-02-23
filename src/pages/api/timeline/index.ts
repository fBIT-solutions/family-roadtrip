import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import * as timelineApi from "@/api/timeline";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const events = await timelineApi.getTimelineEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch timeline events" });
    }
  } else if (req.method === "POST") {
    try {
      const event = await timelineApi.createTimelineEvent({
        ...req.body,
        createdBy: session.user?.email || "",
      });
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create timeline event" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
