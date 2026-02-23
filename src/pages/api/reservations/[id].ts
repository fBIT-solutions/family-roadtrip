import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as reservationApi from "@/api/reservations";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const reservation = await reservationApi.getReservation(id as string);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.status(200).json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reservation" });
    }
  } else if (req.method === "PUT") {
    try {
      const reservation = await reservationApi.updateReservation(id as string, req.body);
      if (!reservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.status(200).json(reservation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update reservation" });
    }
  } else if (req.method === "DELETE") {
    try {
      const success = await reservationApi.deleteReservation(id as string);
      if (!success) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reservation" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
