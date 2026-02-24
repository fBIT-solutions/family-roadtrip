import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.error("No session found - Authorization required");
    return res.status(401).json({ error: "Unauthorized", details: "No valid session" });
  }

  console.log(`Destinations API called by: ${session.user?.email}`);

  if (req.method === "GET") {
    try {
      const destinations = await destinationApi.getDestinations();
      console.log(`Returning ${destinations.length} destinations`);
      res.status(200).json(destinations);
    } catch (error) {
      console.error("API Error fetching destinations:", error);
      res.status(500).json({ error: "Failed to fetch destinations", details: String(error) });
    }
  } else if (req.method === "POST") {
    try {
      const destination = await destinationApi.createDestination({
        ...req.body,
        addedBy: session.user?.email || "",
      });
      res.status(201).json(destination);
    } catch (error) {
      res.status(500).json({ error: "Failed to create destination" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
