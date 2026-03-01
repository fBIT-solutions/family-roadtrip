import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as travelerRequestsApi from "../../../api/travelerRequests";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requests = await travelerRequestsApi.getTravelerRequestsByUser(session.user.email);
    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching user requests:", error);
    return res.status(500).json({ error: "Failed to fetch requests" });
  }
}
