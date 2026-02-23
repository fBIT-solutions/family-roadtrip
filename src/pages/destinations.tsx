import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { Destination } from "@/types/schema";

export default function Destinations() {
  const { data: session, status } = useSession();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDestinations();
    }
  }, [status]);

  const fetchDestinations = async () => {
    try {
      const response = await axios.get("/api/destinations");
      setDestinations(response.data);
    } catch (error) {
      console.error("Error fetching destinations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/destinations", {
        name: newName,
        location: newLocation,
        description: newDescription,
      });
      setDestinations([...destinations, response.data]);
      setNewName("");
      setNewLocation("");
      setNewDescription("");
    } catch (error) {
      console.error("Error adding destination:", error);
    }
  };

  const handleVote = async (id: string) => {
    try {
      await axios.post(`/api/destinations/${id}?action=vote`);
      fetchDestinations();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Sign In to View Destinations
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

        <h1 className="text-3xl font-bold text-gray-800 mb-8">🌍 Destination Ideas</h1>

        {/* Add Destination Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Suggest a Destination</h2>
          <form onSubmit={handleAddDestination} className="space-y-4">
            <input
              type="text"
              placeholder="Destination name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Location/Address"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Destination
            </button>
          </form>
        </div>

        {/* Destinations List */}
        {loading ? (
          <p className="text-center text-gray-600">Loading destinations...</p>
        ) : (
          <div className="space-y-4">
            {destinations.length === 0 ? (
              <p className="text-center text-gray-600">No destinations yet. Be the first to suggest one!</p>
            ) : (
              destinations.map((dest) => (
                <div key={dest.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{dest.name}</h3>
                      <p className="text-gray-600">{dest.location}</p>
                      {dest.description && <p className="text-gray-500 mt-2">{dest.description}</p>}
                      <p className="text-sm text-gray-400 mt-2">Added by: {dest.addedBy}</p>
                    </div>
                    <button
                      onClick={() => handleVote(dest.id)}
                      className="ml-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                    >
                      👍 {dest.votes}
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
