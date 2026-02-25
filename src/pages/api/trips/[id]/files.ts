import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { getTrip } from "@/api/trips";
import { uploadFile, getFilesByTripId } from "@/api/storage";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  try {
    // Verify trip exists
    const trip = await getTrip(id as string);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (req.method === "GET") {
      // Get files for this trip
      const files = await getFilesByTripId(id as string);
      return res.status(200).json(files);
    }

    if (req.method === "POST") {
      const { filename, fileData, category, destinationId, activityId } = req.body;

      if (!filename || !fileData || !category) {
        return res.status(400).json({
          error: "Missing required fields: filename, fileData, category",
        });
      }

      // Convert base64 to blob
      const binaryString = atob(fileData.split(",")[1]);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const file = new File([blob], filename, { type: "application/octet-stream" });

      const fileMetadata = await uploadFile(
        file,
        category as "document" | "ticket" | "picture" | "video" | "other",
        session.user.email,
        id as string,
        destinationId,
        activityId
      );

      return res.status(201).json(fileMetadata);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Files API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
