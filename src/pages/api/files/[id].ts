import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as storageApi from "@/api/storage";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const success = await storageApi.deleteFile(id as string);
      if (!success) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
