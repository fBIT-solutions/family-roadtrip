import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import * as permissionsApi from "@/api/itemPermissions";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email;

  if (req.method === "PATCH") {
    const { itemId, itemType, isPublic } = req.body;

    if (!itemId || !itemType || typeof isPublic !== "boolean") {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    try {
      // Check if requester is the owner
      const permissions = await permissionsApi.getItemPermissions(itemId);
      const isOwner = permissions.some(p => p.userId === userEmail && p.role === "owner");

      if (!isOwner) {
        return res.status(403).json({ error: "Only item owner can change public status" });
      }

      if (isPublic) {
        const publicPermission = await permissionsApi.makePublic(
          itemId,
          itemType as any,
          "reader"
        );
        return res.status(200).json({ success: true, permission: publicPermission });
      } else {
        await permissionsApi.makePrivate(itemId);
        return res.status(200).json({ success: true });
      }
    } catch (error) {
      console.error("Error toggling public status:", error);
      return res.status(500).json({ error: "Failed to toggle public status" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
