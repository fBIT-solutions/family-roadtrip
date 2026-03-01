import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { getUserPermissionRole } from "../../../api/itemPermissions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { itemId, itemType } = req.query;
    if (!itemId || !itemType) {
      return res.status(400).json({ error: "Missing itemId or itemType" });
    }

    const userEmail = session.user.email;
    const role = await getUserPermissionRole(
      itemId as string,
      userEmail
    );

    return res.status(200).json({ role: role || null });
  } catch (error) {
    console.error("Error fetching user permission role:", error);
    return res.status(500).json({ error: "Failed to fetch permission" });
  }
}
