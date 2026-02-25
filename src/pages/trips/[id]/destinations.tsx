import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";
import { Trip, Destination } from "@/types/schema";

interface TripDestinationsData {
  trip: Trip;
  destinations: Destination[];
}

interface Recommendation {
  name: string;
  country: string;
  place?: string;
  description?: string;
  estimatedBudget?: number;
  sourceUrl?: string;
}

export default function TripDestinations() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<TripDestinationsData | null>(null);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    place: "",
    country: "",
    description: "",
    mainPhotoUrl: "",
    estimatedBudget: 0,
    urls: [] as string[],
    latitude: 0,
    longitude: 0,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    place: "",
    country: "",
    description: "",
    mainPhotoUrl: "",
    estimatedBudget: 0,
    status: "proposed",
    urls: [] as string[],
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`/api/trips/${id}`);
      setData({
        trip: response.data.trip,
        destinations: response.data.destinations,
      });
      
      // Also fetch all destinations to show unlinked ones
      const allDestsResponse = await axios.get("/api/destinations");
      setAllDestinations(allDestsResponse.data);
    } catch (error) {
      console.error("Error fetching trip data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch coordinates from backend API when place/country changes
  const fetchCoordinates = useCallback(async (place: string, country: string) => {
    if (!place && !country) return;

    try {
      const response = await axios.get("/api/coordinates", {
        params: { place, country },
      });

      if (response.data.latitude && response.data.longitude) {
        setFormData((prev) => ({
          ...prev,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
        }));
        console.log(`Coordinates fetched: ${response.data.latitude}, ${response.data.longitude}`);
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      // Silently fail - user can still enter coordinates manually
    }
  }, []);

  // Auto-fetch coordinates when place or country changes in Add modal
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.place || formData.country) {
        fetchCoordinates(formData.place, formData.country);
      }
    }, 500); // Debounce for 500ms to avoid excessive API calls

    return () => clearTimeout(timer);
  }, [formData.place, formData.country, fetchCoordinates]);

  // Fetch coordinates for edit form when place or country changes
  const fetchEditCoordinates = useCallback(async (place: string, country: string) => {
    if (!place && !country) return;

    try {
      const response = await axios.get("/api/coordinates", {
        params: { place, country },
      });

      if (response.data.latitude && response.data.longitude) {
        setEditFormData((prev) => ({
          ...prev,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
        }));
        console.log(`Coordinates fetched for edit: ${response.data.latitude}, ${response.data.longitude}`);
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      // Silently fail - user can still enter coordinates manually
    }
  }, []);

  // Auto-fetch coordinates when place or country changes in Edit modal
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editFormData.place || editFormData.country) {
        fetchEditCoordinates(editFormData.place, editFormData.country);
      }
    }, 500); // Debounce for 500ms to avoid excessive API calls

    return () => clearTimeout(timer);
  }, [editFormData.place, editFormData.country, fetchEditCoordinates]);

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setShowRecommendations(false);
    setRecommendations([]);
  };

  const handleGenerateRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await axios.post("/api/ai/recommend-destinations", {
        budget: data?.trip.totalBudget || 5000,
        currency: data?.trip.currency || "USD",
        tripDurationDays: data?.trip.days || 7,
        tripDurationMin: 1,
        tripDurationMax: 3,
      });
      // Extract recommendations array from response
      setRecommendations(response.data.recommendations || []);
      setShowRecommendations(true);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSelectRecommendation = async (rec: Recommendation) => {
    try {
      await axios.post("/api/destinations", {
        name: rec.name,
        place: rec.place || rec.country,
        country: rec.country,
        description: rec.description,
        estimatedBudget: rec.estimatedBudget,
        tripId: id,
        status: "proposed",
      });
      setShowAddModal(false);
      setFormData({
        name: "",
        place: "",
        country: "",
        description: "",
        mainPhotoUrl: "",
        estimatedBudget: 0,
        urls: [],
        latitude: 0,
        longitude: 0,
      });
      // Refresh destinations
      fetchData();
    } catch (error) {
      console.error("Error adding destination:", error);
      alert("Failed to add destination");
    }
  };

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await axios.post("/api/destinations", {
        ...formData,
        tripId: id,
        status: "proposed",
      });
      setShowAddModal(false);
      setFormData({
        name: "",
        place: "",
        country: "",
        description: "",
        mainPhotoUrl: "",
        estimatedBudget: 0,
        urls: [],
        latitude: 0,
        longitude: 0,
      });
      // Refresh destinations
      fetchData();
    } catch (error) {
      console.error("Error adding destination:", error);
      alert("Failed to add destination");
    }
  };

  const handleRemoveDestination = async (destId: string) => {
    if (!confirm("Remove this destination from the trip?")) return;

    try {
      await axios.delete(`/api/destinations/${destId}`);
      // Refresh destinations
      fetchData();
    } catch (error) {
      console.error("Error removing destination:", error);
      alert("Failed to remove destination");
    }
  };

  const handleDislikeRecommendation = async (rec: Recommendation) => {
    try {
      await axios.post("/api/recommendations/dislike", {
        type: "destination",
        recommendationId: `${rec.name}-${rec.country}`,
        name: rec.name,
        category: rec.country,
        reason: "User rejected from recommendations",
      });
      // Remove from displayed recommendations
      setRecommendations(recommendations.filter(r => r.name !== rec.name));
    } catch (error) {
      console.error("Error marking as disliked:", error);
      alert("Failed to mark as disliked");
    }
  };

  const handleOpenEditModal = (destination: Destination) => {
    setEditingDestination(destination);
    setEditFormData({
      name: destination.name,
      place: destination.place,
      country: destination.country,
      description: destination.description || "",
      mainPhotoUrl: destination.mainPhotoUrl || "",
      estimatedBudget: destination.estimatedBudget || 0,
      status: destination.status,
      urls: destination.urls || [],
      latitude: destination.latitude || 0,
      longitude: destination.longitude || 0,
    });
    setShowEditModal(true);
  };

  const handleUpdateDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDestination) return;

    try {
      await axios.put(`/api/destinations/${editingDestination.id}`, editFormData);
      setShowEditModal(false);
      setEditingDestination(null);
      // Refresh destinations
      fetchData();
    } catch (error) {
      console.error("Error updating destination:", error);
      alert("Failed to update destination");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center">Trip not found</div>;
  }

  const { trip, destinations } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Destinations</h1>
              <p className="text-gray-600 mt-2">Managing destinations for: <span className="font-semibold">{trip.name}</span></p>
            </div>
            <Link href={`/trips/${trip.id}`}>
              <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">← Back to Trip</button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            Destinations ({destinations.length})
          </h2>
          <button
            onClick={handleOpenAddModal}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            + Add Destination
          </button>
        </div>

        {destinations.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <p className="text-gray-600 mb-4">No destinations added yet. Add your first destination to get started!</p>
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add First Destination
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((dest) => (
              <div
                key={dest.id}
                onClick={() => router.push(`/destinations/${dest.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden border-l-4 border-blue-500 cursor-pointer"
              >
                {dest.mainPhotoUrl && (
                  <div className="relative w-full h-40 bg-gray-200">
                    <img
                      src={dest.mainPhotoUrl}
                      alt={dest.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{dest.name}</h3>
                      <p className="text-sm text-gray-600">{dest.place}, {dest.country}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-semibold ${
                      dest.status === "proposed" ? "bg-yellow-100 text-yellow-800" :
                      dest.status === "accepted" ? "bg-green-100 text-green-800" :
                      dest.status === "planned" ? "bg-blue-100 text-blue-800" :
                      "bg-purple-100 text-purple-800"
                    }`}>
                      {dest.status}
                    </span>
                  </div>

                  {dest.description && (
                    <p className="text-gray-600 text-sm mb-3">{dest.description}</p>
                  )}

                  <div className="space-y-2 text-sm text-gray-700 mb-4">
                    {dest.estimatedBudget && (
                      <div>💰 {dest.currency} {dest.estimatedBudget.toLocaleString()}</div>
                    )}
                    <div>👍 {dest.votes} votes</div>
                  </div>

                  <button
                    onClick={() => handleRemoveDestination(dest.id)}
                    className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
                  >
                    Remove from Trip
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(dest)}
                    className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Destinations Section */}
        {data && allDestinations.length > 0 && (
          <>
            <div className="mt-12">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                Available Destinations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allDestinations
                  .filter((dest) => !data.destinations.find((d) => d.id === dest.id))
                  .map((dest) => (
                    <div
                      key={dest.id}
                      onClick={() => router.push(`/destinations/${dest.id}`)}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden border-l-4 border-green-500 cursor-pointer"
                    >
                      {dest.mainPhotoUrl && (
                        <div className="relative w-full h-40 bg-gray-200">
                          <img
                            src={dest.mainPhotoUrl}
                            alt={dest.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{dest.name}</h3>
                            <p className="text-sm text-gray-600">{dest.place}, {dest.country}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded font-semibold ${
                            dest.status === "proposed" ? "bg-yellow-100 text-yellow-800" :
                            dest.status === "accepted" ? "bg-green-100 text-green-800" :
                            dest.status === "planned" ? "bg-blue-100 text-blue-800" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                            {dest.status}
                          </span>
                        </div>

                        {dest.description && (
                          <p className="text-gray-600 text-sm mb-3">{dest.description}</p>
                        )}

                        <div className="space-y-2 text-sm text-gray-700 mb-4">
                          {dest.estimatedBudget && (
                            <div>💰 {dest.currency} {dest.estimatedBudget.toLocaleString()}</div>
                          )}
                          <div>👍 {dest.votes} votes</div>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              // Update the destination to link it to this trip
                              await axios.put(`/api/destinations/${dest.id}`, {
                                tripId: id,
                              });
                              await fetchData();
                            } catch (error) {
                              console.error("Error adding destination:", error);
                              alert("Failed to add destination");
                            }
                          }}
                          className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                        >
                          Add to This Trip
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(dest)}
                          className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Destination Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Destination</h3>
            
            {/* Generate Button */}
            {!showRecommendations && (
              <div className="mb-6">
                <button
                  onClick={handleGenerateRecommendations}
                  disabled={loadingRecommendations}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition font-semibold"
                >
                  {loadingRecommendations ? "Generating Suggestions..." : "💡 Generate AI Suggestions"}
                </button>
              </div>
            )}

            {/* Recommendations Section */}
            {showRecommendations && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-800">Suggested Destinations</h4>
                  <button
                    onClick={() => setShowRecommendations(false)}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Hide
                  </button>
                </div>
                
                {loadingRecommendations ? (
                  <div className="p-4 bg-blue-50 rounded-lg text-center text-gray-600">
                    Loading suggestions...
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-2">
                    {recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition cursor-pointer border border-blue-200 flex justify-between items-start"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{rec.name}</p>
                          <p className="text-sm text-gray-600">{rec.place || rec.country}, {rec.country}</p>
                          {rec.description && (
                            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                          )}
                          {rec.estimatedBudget && (
                            <p className="text-sm text-blue-600 mt-1">💰 Est. ${rec.estimatedBudget.toLocaleString()}</p>
                          )}
                        </div>
                        <div className="ml-3 flex gap-2 flex-col">
                          <button
                            type="button"
                            onClick={() => handleSelectRecommendation(rec)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 whitespace-nowrap"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDislikeRecommendation(rec)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 whitespace-nowrap"
                          >
                            Dislike
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 rounded-lg text-center text-gray-600">
                    No suggestions available
                  </div>
                )}
                <div className="my-4 border-t-2 border-gray-200"></div>
              </div>
            )}

            {/* Manual Entry Form */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Or Add Manually</h4>
              <form onSubmit={handleAddDestination} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Destination Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Paris"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Place/Region *</label>
                  <input
                    type="text"
                    value={formData.place}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                    placeholder="e.g., Île-de-France"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Country *</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., France"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details about this destination..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Destination
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Destination Modal */}
      {showEditModal && editingDestination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Destination</h3>
            <form onSubmit={handleUpdateDestination} className="space-y-4 pb-20">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Destination Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g., Paris"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Place/Region *</label>
                <input
                  type="text"
                  value={editFormData.place}
                  onChange={(e) => setEditFormData({ ...editFormData, place: e.target.value })}
                  placeholder="e.g., Île-de-France"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Country *</label>
                <input
                  type="text"
                  value={editFormData.country}
                  onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                  placeholder="e.g., France"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="proposed">Proposed</option>
                  <option value="accepted">Accepted</option>
                  <option value="planned">Planned</option>
                  <option value="visited">Visited</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Add details about this destination..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Main Photo URL</label>
                <input
                  type="url"
                  value={editFormData.mainPhotoUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, mainPhotoUrl: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Budget</label>
                <input
                  type="number"
                  value={editFormData.estimatedBudget}
                  onChange={(e) => setEditFormData({ ...editFormData, estimatedBudget: +e.target.value })}
                  placeholder="e.g., 1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URLs (comma separated)</label>
                <textarea
                  value={editFormData.urls.join(", ")}
                  onChange={(e) => setEditFormData({ ...editFormData, urls: e.target.value.split(",").map(u => u.trim()).filter(u => u.length > 0) })}
                  placeholder="https://example1.com, https://example2.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                />
              </div>

              {/* Coordinates Footer */}
              <div className="border-t pt-4 mt-6">
                <div className="text-xs font-semibold text-gray-600 mb-3">Coordinates (Optional)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={editFormData.latitude}
                    onChange={(e) => setEditFormData({ ...editFormData, latitude: +e.target.value })}
                    placeholder="Latitude"
                    step="0.000001"
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={editFormData.longitude}
                    onChange={(e) => setEditFormData({ ...editFormData, longitude: +e.target.value })}
                    placeholder="Longitude"
                    step="0.000001"
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 fixed bottom-6 left-4 right-4 bg-white">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}