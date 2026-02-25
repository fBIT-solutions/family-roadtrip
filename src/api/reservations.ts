import { containers } from "@/lib/cosmosdb";
import { Reservation, ReservationSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export async function createReservation(
  data: Omit<Reservation, "id" | "createdAt" | "updatedAt">
): Promise<Reservation> {
  const reservation: Reservation = {
    ...data,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await containers.trips.items.create(reservation);
    return reservation;
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw new Error("Failed to create reservation");
  }
}

export async function getReservations(): Promise<Reservation[]> {
  try {
    const { resources } = await containers.trips.items
      .query("SELECT * FROM c ORDER BY c.startDate ASC")
      .fetchAll();

    return resources.map((r: any) => ReservationSchema.parse(r));
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }
}

export async function getReservation(id: string): Promise<Reservation | null> {
  try {
    const { resources } = await containers.trips.items
      .query({
        query: `SELECT * FROM c WHERE c.id = @id`,
        parameters: [{ name: "@id", value: id }],
      })
      .fetchAll();

    if (resources.length === 0) return null;
    return ReservationSchema.parse(resources[0]);
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return null;
  }
}

export async function updateReservation(
  id: string,
  data: Partial<Reservation>
): Promise<Reservation | null> {
  try {
    const existing = await getReservation(id);
    if (!existing) return null;

    const updated: Reservation = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    const { resource } = await containers.trips.item(id, id).replace(updated);
    return resource ? ReservationSchema.parse(resource) : null;
  } catch (error) {
    console.error("Error updating reservation:", error);
    return null;
  }
}

export async function deleteReservation(id: string): Promise<boolean> {
  try {
    const reservation = await getReservation(id);
    if (!reservation) return false;
    
    await containers.trips.item(id, id).delete();
    return true;
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return false;
  }
}
