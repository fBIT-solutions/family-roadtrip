import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as storageApi from "@/api/storage";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "POST") {
    try {
      const { filename, fileData, category, relatedId } = req.body;

      const blob = new Blob([Buffer.from(fileData, "base64")], {
        type: req.body.fileType,
      });
      const file = new File([blob], filename, { type: req.body.fileType });

      const fileMetadata = await storageApi.uploadFile(
        file,
        category,
        session.user?.email || "",
        relatedId
      );

      res.status(201).json(fileMetadata);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  } else if (req.method === "GET") {
    try {
      const { category } = req.query;
      const files = await storageApi.getFilesByCategory(category as any);
      res.status(200).json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
