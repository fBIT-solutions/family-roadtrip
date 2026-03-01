import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import * as permissionsApi from "@/api/itemPermissions";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email;

  if (req.method === "GET") {
    const { itemId, userId, itemType, role } = req.query;

    try {
      if (itemId && typeof itemId === "string") {
        // Get all permissions for an item
        const permissions = await permissionsApi.getItemPermissions(itemId);
        return res.status(200).json(permissions);
      }

      if (userId && itemType && typeof userId === "string" && typeof itemType === "string") {
        // Get all items of a specific type for a user
        const items = await permissionsApi.getUserItems(
          userId,
          itemType,
          role as "owner" | "contributor" | "reader" | undefined
        );
        return res.status(200).json(items);
      }

      return res.status(400).json({ error: "Missing required query parameters" });
    } catch (error) {
      console.error("Error fetching permissions:", error);
      return res.status(500).json({ error: "Failed to fetch permissions" });
    }
  }

  if (req.method === "POST") {
    const { itemId, itemType, userId, role, parentType, parentId } = req.body;

    if (!itemId || !itemType || !userId || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Check if requester is the owner
      const itemPermissions = await permissionsApi.getItemPermissions(itemId);
      const isOwner = itemPermissions.some(p => p.userId === userEmail && p.role === "owner");

      if (!isOwner && userEmail !== userId) {
        return res.status(403).json({ error: "You can only grant permissions on items you own" });
      }

      const permission = await permissionsApi.grantPermission(
        itemId,
        itemType,
        userId,
        role,
        parentType,
        parentId
      );

      return res.status(201).json(permission);
    } catch (error) {
      console.error("Error granting permission:", error);
      return res.status(500).json({ error: "Failed to grant permission" });
    }
  }

  if (req.method === "PATCH") {
    const { itemId, userId, role } = req.body;

    if (!itemId || !userId || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Check if requester is the owner
      const itemPermissions = await permissionsApi.getItemPermissions(itemId);
      const isOwner = itemPermissions.some(p => p.userId === userEmail && p.role === "owner");

      if (!isOwner) {
        return res.status(403).json({ error: "Only item owner can update permissions" });
      }

      const updatedPermission = await permissionsApi.updatePermissionRole(itemId, userId, role);

      if (!updatedPermission) {
        return res.status(404).json({ error: "Permission not found" });
      }

      return res.status(200).json(updatedPermission);
    } catch (error) {
      console.error("Error updating permission:", error);
      return res.status(500).json({ error: "Failed to update permission" });
    }
  }

  if (req.method === "DELETE") {
    const { itemId, userId } = req.body;

    if (!itemId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Check if requester is the owner
      const itemPermissions = await permissionsApi.getItemPermissions(itemId);
      const isOwner = itemPermissions.some(p => p.userId === userEmail && p.role === "owner");

      if (!isOwner && userEmail !== userId) {
        return res.status(403).json({ error: "Only item owner can revoke permissions" });
      }

      await permissionsApi.revokePermission(itemId, userId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error revoking permission:", error);
      return res.status(500).json({ error: "Failed to revoke permission" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
