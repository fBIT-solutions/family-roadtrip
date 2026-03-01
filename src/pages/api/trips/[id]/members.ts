import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import * as tripsApi from "@/api/trips";
import * as permissionsApi from "@/api/itemPermissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const userEmail = session.user?.email;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Trip ID is required" });
  }

  if (req.method === "POST") {
    try {
      // Check if user is trip owner
      const isOwner = await permissionsApi.isOwner(id, userEmail || "");
      if (!isOwner) {
        return res.status(403).json({ error: "Only the trip owner can manage members" });
      }

      const { email, role } = req.body; // role: "contributor" | "reader"

      if (!email || !["contributor", "reader"].includes(role)) {
        return res.status(400).json({ error: "Invalid email or role" });
      }

      // Add member based on role
      if (role === "contributor") {
        await tripsApi.addTravelerToTrip(id, email);
      } else {
        await tripsApi.addViewerToTrip(id, email);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error adding trip member:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  } else if (req.method === "DELETE") {
    try {
      // Check if user is trip owner
      const isOwner = await permissionsApi.isOwner(id, userEmail || "");
      if (!isOwner) {
        return res.status(403).json({ error: "Only the trip owner can manage members" });
      }

      const { email } = req.query;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get user's role to determine removal method
      const userRole = await permissionsApi.getUserPermissionRole(id, email);
      
      if (userRole === "contributor") {
        await tripsApi.removeTravelerFromTrip(id, email);
      } else if (userRole === "reader") {
        await tripsApi.removeViewerFromTrip(id, email);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error removing trip member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
