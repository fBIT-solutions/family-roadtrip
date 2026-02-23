import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import * as reservationApi from "@/api/reservations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const reservations = await reservationApi.getReservations();
      res.status(200).json(reservations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservations" });
    }
  } else if (req.method === "POST") {
    try {
      const reservation = await reservationApi.createReservation({
        ...req.body,
        createdBy: session.user?.email || "",
      });
      res.status(201).json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create reservation" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
