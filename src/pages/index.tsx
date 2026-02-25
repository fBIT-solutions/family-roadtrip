import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import axios from "axios";
import { Trip } from "@/types/schema";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddDestinationModal, setShowAddDestinationModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    goal: "adventure" as const,
    startDate: "",
    endDate: "",
    travelers: "",
    hasPet: false,
    totalBudget: 5000,
    currency: "EUR",
    description: "",
  });
  const [destinationFormData, setDestinationFormData] = useState({
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
  const [activityFormData, setActivityFormData] = useState({
    name: "",
    description: "",
    category: "outdoor" as const,
    url: "",
    estimatedCost: "",
    duration: "",
  });

  const goals = ["relaxation", "adventure", "work", "cultural", "food", "family", "other"] as const;

  useEffect(() => {
    if (session) {
      fetchTrips();
    }
  }, [session]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/trips");
      setTrips(response.data);
    } catch (error) {
      console.error("Error fetching trips:", error);
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
        setDestinationFormData((prev) => ({
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

  // Auto-fetch coordinates when place or country changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (destinationFormData.place || destinationFormData.country) {
        fetchCoordinates(destinationFormData.place, destinationFormData.country);
      }
    }, 500); // Debounce for 500ms to avoid excessive API calls

    return () => clearTimeout(timer);
  }, [destinationFormData.place, destinationFormData.country, fetchCoordinates]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      // Parse travelers - split by comma and filter empty values
      const travelersArray = formData.travelers
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      
      // Always include current user
      if (session?.user?.email && !travelersArray.includes(session.user.email)) {
        travelersArray.push(session.user.email);
      }

      const response = await axios.post("/api/trips", {
        name: formData.name,
        goal: formData.goal,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        people: travelersArray.length > 0 ? travelersArray : [session?.user?.email],
        hasPet: formData.hasPet,
        totalBudget: formData.totalBudget,
        currency: formData.currency,
        description: formData.description,
        status: "planning",
      });
      setTrips([response.data, ...trips]);
      setShowCreateModal(false);
      setFormData({
        name: "",
        goal: "adventure",
        startDate: "",
        endDate: "",
        travelers: "",
        hasPet: false,
        totalBudget: 5000,
        currency: "EUR",
        description: "",
      });
    } catch (error) {
      console.error("Error creating trip:", error);
      alert("Failed to create trip");
    }
  };

  const handleDeleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this trip?")) return;

    try {
      await axios.delete(`/api/trips/${tripId}`);
      setTrips(trips.filter((t) => t.id !== tripId));
    } catch (error) {
      console.error("Error deleting trip:", error);
      alert("Failed to delete trip");
    }
  };

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationFormData.name || !destinationFormData.place || !destinationFormData.country) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      await axios.post("/api/destinations", {
        name: destinationFormData.name,
        place: destinationFormData.place,
        country: destinationFormData.country,
        description: destinationFormData.description,
        mainPhotoUrl: destinationFormData.mainPhotoUrl,
        estimatedBudget: destinationFormData.estimatedBudget,
        urls: destinationFormData.urls,
        latitude: destinationFormData.latitude || undefined,
        longitude: destinationFormData.longitude || undefined,
        status: "proposed",
      });
      setShowAddDestinationModal(false);
      setDestinationFormData({
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
      alert("Destination added successfully!");
    } catch (error) {
      console.error("Error adding destination:", error);
      alert("Failed to add destination");
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityFormData.name) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      await axios.post("/api/activities", {
        name: activityFormData.name,
        description: activityFormData.description || undefined,
        category: activityFormData.category,
        url: activityFormData.url || undefined,
        estimatedCost: activityFormData.estimatedCost ? parseFloat(activityFormData.estimatedCost) : undefined,
        duration: activityFormData.duration || undefined,
        status: "suggested",
      });
      setShowAddActivityModal(false);
      setActivityFormData({
        name: "",
        description: "",
        category: "outdoor",
        url: "",
        estimatedCost: "",
        duration: "",
      });
      alert("Activity added successfully!");
    } catch (error) {
      console.error("Error adding activity:", error);
      alert("Failed to add activity");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600">🚗 Trip Planner</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {session ? (
                <>
                  <span className="text-xs sm:text-sm text-gray-700 hidden sm:block">Welcome, {session.user?.name}</span>
                  <Link href="/preferences">
                    <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
                      ⚙️ Preferences
                    </button>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {session ? (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">My Trips</h2>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowAddDestinationModal(true)}
                className="flex-1 sm:flex-initial px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                + Destination
              </button>
              <button
                onClick={() => setShowAddActivityModal(true)}
                className="flex-1 sm:flex-initial px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                + Activity
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 sm:flex-initial px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                + Trip
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-600">Loading trips...</div>
          ) : trips.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center">
              <p className="text-gray-600 mb-4">No trips yet. Create your first trip to get started!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create First Trip
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                  className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{trip.name}</h3>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                        {trip.goal}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-semibold ${
                      trip.status === "planning" ? "bg-yellow-100 text-yellow-800" :
                      trip.status === "active" ? "bg-green-100 text-green-800" :
                      trip.status === "completed" ? "bg-blue-100 text-blue-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {trip.status}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{trip.description}</p>

                  <div className="space-y-2 text-sm text-gray-700 mb-4">
                    <div>📅 {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</div>
                    <div>⏱️  {trip.days} days</div>
                    <div>👥 {trip.people.length} person{trip.people.length !== 1 ? "s" : ""} {trip.hasPet && "🐾"}</div>
                    <div>💰 {trip.currency} {trip.totalBudget.toLocaleString()}</div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                    className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
                  >
                    Delete Trip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-4">Plan Your Trips</h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            Sign in to start planning your adventures!
          </p>
          <button
            onClick={() => signIn()}
            className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-base sm:text-lg rounded-lg hover:bg-blue-700"
          >
            Sign In to Get Started
          </button>
        </div>
      )}

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Create New Trip</h3>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Trip Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer 2025 Europe"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Goal *</label>
                <select
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {goals.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Travelers</label>
                <input
                  type="text"
                  value={formData.travelers}
                  onChange={(e) => setFormData({ ...formData, travelers: e.target.value })}
                  placeholder="Add emails separated by commas (e.g., john@example.com, jane@example.com)"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">You will be automatically added as a traveler</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Budget *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: +e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>EUR</option>
                    <option>USD</option>
                    <option>GBP</option>
                    <option>JPY</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasPet"
                  checked={formData.hasPet}
                  onChange={(e) => setFormData({ ...formData, hasPet: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="hasPet" className="text-sm font-semibold text-gray-700">
                  Pet traveling with us 🐾
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details about your trip..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Destination Modal */}
      {showAddDestinationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Destination</h3>
            <form onSubmit={handleAddDestination} className="space-y-4 pb-24">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Destination Name *</label>
                <input
                  type="text"
                  value={destinationFormData.name}
                  onChange={(e) => setDestinationFormData({ ...destinationFormData, name: e.target.value })}
                  placeholder="e.g., Paris"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Place/Region *</label>
                <input
                  type="text"
                  value={destinationFormData.place}
                  onChange={(e) => setDestinationFormData({ ...destinationFormData, place: e.target.value })}
                  placeholder="e.g., Île-de-France"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Country *</label>
                <input
                  type="text"
                  value={destinationFormData.country}
                  onChange={(e) => setDestinationFormData({ ...destinationFormData, country: e.target.value })}
                  placeholder="e.g., France"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={destinationFormData.description}
                  onChange={(e) => setDestinationFormData({ ...destinationFormData, description: e.target.value })}
                  placeholder="Add details about this destination..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Main Photo URL</label>
                <input
                  type="url"
                  value={destinationFormData.mainPhotoUrl}
                  onChange={(e) => setDestinationFormData({ ...destinationFormData, mainPhotoUrl: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Budget</label>
                <input
                  type="number"
                  value={destinationFormData.estimatedBudget}
                  onChange={(e) => setDestinationFormData({ ...destinationFormData, estimatedBudget: +e.target.value })}
                  placeholder="e.g., 1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URLs (comma separated)</label>
                <textarea
                  value={destinationFormData.urls.join(", ")}
                  onChange={(e) => setDestinationFormData({ ...destinationFormData, urls: e.target.value.split(",").map(u => u.trim()).filter(u => u.length > 0) })}
                  placeholder="https://example1.com, https://example2.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                />
              </div>

              <div className="flex gap-3 pt-4 fixed bottom-6 left-4 right-4 bg-white">
                <button
                  type="button"
                  onClick={() => setShowAddDestinationModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Activity</h3>
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Activity Name *</label>
                <input
                  type="text"
                  value={activityFormData.name}
                  onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })}
                  placeholder="e.g., Visit Eiffel Tower"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={activityFormData.category}
                  onChange={(e) => setActivityFormData({ ...activityFormData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="outdoor">Outdoor</option>
                  <option value="cultural">Cultural</option>
                  <option value="food">Food</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="shopping">Shopping</option>
                  <option value="sports">Sports</option>
                  <option value="relaxation">Relaxation</option>
                  <option value="adventure">Adventure</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })}
                  placeholder="Add details about the activity..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Cost</label>
                  <input
                    type="number"
                    value={activityFormData.estimatedCost}
                    onChange={(e) => setActivityFormData({ ...activityFormData, estimatedCost: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={activityFormData.duration}
                    onChange={(e) => setActivityFormData({ ...activityFormData, duration: e.target.value })}
                    placeholder="e.g., 2 hours"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={activityFormData.url}
                  onChange={(e) => setActivityFormData({ ...activityFormData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
