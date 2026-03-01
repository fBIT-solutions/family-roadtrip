import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as travelerRequestsApi from "../../../api/travelerRequests";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id, action } = req.query;
  if (!id || !action) {
    return res.status(400).json({ error: "Missing id or action" });
  }

  try {
    const request = await travelerRequestsApi.getTravelerRequest(id as string);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Verify user is the trip owner
    if (request.ownerId !== session.user.email) {
      return res.status(403).json({ error: "Only trip owner can manage requests" });
    }

    let result;
    if (action === "approve") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      result = await travelerRequestsApi.approveTravelerRequest(id as string);
    } else if (action === "reject") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      result = await travelerRequestsApi.rejectTravelerRequest(id as string);
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error managing traveler request:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
}
