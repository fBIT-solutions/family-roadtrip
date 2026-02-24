import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { Reservation } from "@/types/schema";

export default function Reservations() {
  const { data: session, status } = useSession();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    type: "hotel" as const,
    startDate: "",
    endDate: "",
    location: "",
    details: "",
    confirmationNumber: "",
    cost: "",
    currency: "EUR",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReservations();
    }
  }, [status]);

  const fetchReservations = async () => {
    try {
      const response = await axios.get("/api/reservations");
      setReservations(response.data);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      };
      const response = await axios.post("/api/reservations", payload);
      setReservations([...reservations, response.data]);
      setFormData({
        title: "",
        type: "hotel",
        startDate: "",
        endDate: "",
        location: "",
        details: "",
        confirmationNumber: "",
        cost: "",
        currency: "EUR",
      });
    } catch (error) {
      console.error("Error adding reservation:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/reservations/${id}`);
      setReservations(reservations.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Error deleting reservation:", error);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Sign In to View Reservations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/">
          <button className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900">← Back</button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">🏨 Reservations & Bookings</h1>

        {/* Add Reservation Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Add a Reservation</h2>
          <form onSubmit={handleAddReservation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="col-span-2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hotel">Hotel</option>
                <option value="restaurant">Restaurant</option>
                <option value="activity">Activity</option>
                <option value="transport">Transport</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Confirmation Number"
                value={formData.confirmationNumber}
                onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Cost"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                step="0.01"
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Details (optional)"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="col-span-2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Reservation
            </button>
          </form>
        </div>

        {/* Reservations List */}
        {loading ? (
          <p className="text-center text-gray-600">Loading reservations...</p>
        ) : (
          <div className="space-y-4">
            {reservations.length === 0 ? (
              <p className="text-center text-gray-600">No reservations yet.</p>
            ) : (
              reservations.map((res) => (
                <div key={res.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{res.title}</h3>
                      <p className="text-gray-600">{res.location} · {res.type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(res.startDate).toLocaleDateString()} 
                        {res.endDate && ` - ${new Date(res.endDate).toLocaleDateString()}`}
                      </p>
                      {res.confirmationNumber && (
                        <p className="text-sm text-gray-500">Confirmation: {res.confirmationNumber}</p>
                      )}
                      {res.cost && (
                        <p className="text-sm text-gray-500">
                          {res.cost} {res.currency}
                        </p>
                      )}
                      {res.details && <p className="text-gray-500 mt-2">{res.details}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
