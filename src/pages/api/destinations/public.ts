import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint is public but authenticated users can access it
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email;

  if (req.method === "GET") {
    try {
      // Get public destinations, optionally exclude user's own destinations
      const publicDestinations = await destinationApi.getPublicDestinations(userEmail || undefined);
      res.status(200).json({ destinations: publicDestinations });
    } catch (error) {
      console.error("Error fetching public destinations:", error);
      res.status(500).json({ error: "Failed to fetch public destinations", details: String(error) });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
