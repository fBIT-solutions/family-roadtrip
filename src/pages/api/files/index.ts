import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as storageApi from "@/api/storage";
import * as tripsApi from "@/api/trips";
import { canViewTripFiles } from "@/lib/auth-helpers";

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

  const userEmail = session.user?.email;

  if (req.method === "POST") {
    try {
      const { filename, fileData, category, tripId, destinationId, activityId } = req.body;

      const blob = new Blob([Buffer.from(fileData, "base64")], {
        type: req.body.fileType,
      });
      const file = new File([blob], filename, { type: req.body.fileType });

      const fileMetadata = await storageApi.uploadFile(
        file,
        category,
        userEmail || "",
        tripId,
        destinationId,
        activityId
      );

      res.status(201).json(fileMetadata);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  } else if (req.method === "GET") {
    try {
      const { category, tripId } = req.query;
      
      // If tripId is provided, filter files for that trip and check access
      if (tripId && typeof tripId === "string") {
        const trip = await tripsApi.getTrip(tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Check if user has access to view files in this trip
        if (!canViewTripFiles(trip, userEmail)) {
          return res.status(403).json({ error: "You do not have access to this trip's files" });
        }

        const files = await storageApi.getFilesByTripId(tripId);
        return res.status(200).json(files);
      }

      // Legacy behavior: get by category
      let files;
      if (category) {
        files = await storageApi.getFilesByCategory(category as any);
      } else {
        // Return all files if no filter is specified
        files = await storageApi.getAllFiles();
      }
      
      res.status(200).json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
