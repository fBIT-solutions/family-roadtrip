import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import axios from "axios";
import { Destination, ItemReference, FileMetadata, Trip } from "@/types/schema";
import { DestinationMap } from "@/components/DestinationMap";
import { DestinationRecommendations } from "@/components/DestinationRecommendations";
import { QuickFileLinks } from "@/components/QuickFileLinks";
import { Topbar } from "@/components/Topbar";
import { isViewer } from "@/lib/auth-helpers";
import * as destinationApi from "@/api/destinations";


const statusColors: Record<string, string> = {
  proposed: "bg-indigo-100 text-indigo-800",
  accepted: "bg-amber-100 text-amber-800",
  planned: "bg-blue-100 text-blue-800",
  visited: "bg-emerald-100 text-emerald-800",
};

export default function Destinations({
  initialDestinations = [],
  initialItemReferences = [],
}: {
  initialDestinations?: Destination[];
  initialItemReferences?: ItemReference[];
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [itemReferences, setItemReferences] = useState<ItemReference[]>(initialItemReferences);
  const [newName, setNewName] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newUrls, setNewUrls] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [newStatus, setNewStatus] = useState<"proposed" | "accepted" | "planned" | "visited">("proposed");
  const [newPublic, setNewPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [publicStatus, setPublicStatus] = useState<Record<string, boolean>>({});
  const [trips, setTrips] = useState<any[]>([]);

  const fetchDestinations = useCallback(async () => {
    try {
      const [destRes, filesRes, tripsRes] = await Promise.all([
        axios.get("/api/destinations", { withCredentials: true }),
        axios.get("/api/files", { withCredentials: true }),
        axios.get("/api/trips", { withCredentials: true }),
      ]);
      const { destinations, itemReferences } = destRes.data;
      setDestinations(destinations || []);
      setItemReferences(itemReferences || []);
      setFiles(filesRes.data);
      setTrips(tripsRes.data || []);
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching destinations:", error);
      const errorMsg = axios.isAxiosError(error) 
        ? error.response?.data?.details || error.response?.data?.error || error.message 
        : String(error);
      setError(`Failed to load destinations: ${errorMsg}`);
      setLoading(false);
    }
  }, []);

  // Fetch coordinates from backend API when place/country changes
  const fetchCoordinates = useCallback(async (place: string, country: string) => {
    if (!place && !country) return;

    try {
      const response = await axios.get("/api/coordinates", {
        params: { place, country },
      });

      if (response.data.latitude && response.data.longitude) {
        setNewLatitude(response.data.latitude.toString());
        setNewLongitude(response.data.longitude.toString());
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
      if (newPlace || newCountry) {
        fetchCoordinates(newPlace, newCountry);
      }
    }, 500); // Debounce for 500ms to avoid excessive API calls

    return () => clearTimeout(timer);
  }, [newPlace, newCountry, fetchCoordinates]);

  // Fetch destinations on page load
  useEffect(() => {
    setLoading(true);
    fetchDestinations();
  }, [fetchDestinations]);

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const urls = newUrls
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const response = await axios.post("/api/destinations", {
        name: newName,
        place: newPlace,
        country: newCountry,
        description: newDescription,
        urls,
        mainPhotoUrl: newPhotoUrl || undefined,
        photos: newPhotoUrl ? [{ url: newPhotoUrl }] : [],
        latitude: newLatitude ? parseFloat(newLatitude) : undefined,
        longitude: newLongitude ? parseFloat(newLongitude) : undefined,
        status: newStatus,
        public: newPublic,
      });
      setDestinations([...destinations, response.data]);
      setNewName("");
      setNewPlace("");
      setNewCountry("");
      setNewDescription("");
      setNewUrls("");
      setNewPhotoUrl("");
      setNewLatitude("");
      setNewLongitude("");
      setNewStatus("proposed");
      setNewPublic(false);
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

  const handleTogglePublic = async (id: string) => {
    try {
      const destination = destinations.find(d => d.id === id);
      if (!destination) return;
      
      const newPublicStatus = !destination.public;
      await axios.patch(`/api/destinations/${id}/make-public`, { isPublic: newPublicStatus });
      
      setDestinations(destinations.map(d => 
        d.id === id ? { ...d, public: newPublicStatus } : d
      ));
    } catch (error) {
      console.error("Error toggling public status:", error);
    }
  };

  const handleAddPublicItem = async (itemRef: ItemReference) => {
    try {
      await axios.post("/api/item-references", {
        type: "destination",
        originalItemId: itemRef.originalItemId,
      });
      
      // Refresh data
      fetchDestinations();
    } catch (error) {
      console.error("Error adding public destination:", error);
    }
  };

  // Combine original destinations with referenced ones for display
  const allDestinationsForDisplay = [
    ...destinations,
    ...itemReferences.filter(ref => ref.type === "destination").map(ref => ({
      ...ref,
      isReference: true,
    })),
  ];

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Link href="/">
          <button className="mb-4 px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900">← Back</button>
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">🌍 Destinations</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/my-space" className="flex-1 sm:flex-initial">
              <button className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition">
                🏠 My Space
              </button>
            </Link>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg ${
                viewMode === "map"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              🗺️ Map
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Add Destination Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Suggest a Destination</h2>
          <form onSubmit={handleAddDestination} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Destination name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Place/City"
                value={newPlace}
                onChange={(e) => setNewPlace(e.target.value)}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Country"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="proposed">Proposed</option>
                <option value="accepted">Accepted</option>
                <option value="planned">Planned</option>
                <option value="visited">Visited</option>
              </select>
            </div>

            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Latitude (optional)"
                value={newLatitude}
                onChange={(e) => setNewLatitude(e.target.value)}
                step="0.0001"
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Longitude (optional)"
                value={newLongitude}
                onChange={(e) => setNewLongitude(e.target.value)}
                step="0.0001"
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              type="url"
              placeholder="Main photo URL (optional)"
              value={newPhotoUrl}
              onChange={(e) => setNewPhotoUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Useful URLs (one per line, optional)"
              value={newUrls}
              onChange={(e) => setNewUrls(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
            />
            <div className="border-t pt-4 mt-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">Share This Destination Publicly</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setNewPublic(!newPublic);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    newPublic ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      newPublic ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                {newPublic ? '🌐 This destination will be shared publicly and other users can discover and add it to their trips.' : '🔒 This destination will be private and only visible to you.'}
              </p>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Destination
            </button>
          </form>
        </div>

        {/* AI Destination Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Get Destination Ideas</h2>
          <DestinationRecommendations
            budget={2000}
            currency="EUR"
            tripDurationDays={14}
            onAddDestination={async (destination) => {
              try {
                const response = await axios.post("/api/destinations", {
                  name: destination.name,
                  place: destination.place,
                  country: destination.country,
                  description: destination.description,
                  latitude: destination.latitude,
                  longitude: destination.longitude,
                  estimatedBudget: destination.estimatedBudget,
                  currency: destination.currency,
                  urls: destination.urls || [],
                });
                setDestinations([response.data, ...destinations]);
              } catch (err) {
                console.error("Error adding recommended destination:", err);
                throw err;
              }
            }}
          />
        </div>

        {/* Map View */}
        {viewMode === "map" && !loading && (
          <div className="mb-8">
            <DestinationMap destinations={destinations as any} />
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div>
            {loading ? (
              <p className="text-center text-gray-600">Loading destinations...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allDestinationsForDisplay.length === 0 ? (
                  <p className="col-span-full text-center text-gray-600">No destinations yet. Be the first to suggest one!</p>
                ) : (
                  allDestinationsForDisplay.map((dest) => {
                    const isOwnItem = 'addedBy' in dest && dest.addedBy === session?.user?.email;
                    const isReference = 'isReference' in dest && dest.isReference;
                    
                    return (
                      <div
                        key={dest.id}
                        className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden flex flex-col cursor-pointer"
                      >
                        {dest.mainPhotoUrl && (
                          <img
                            src={dest.mainPhotoUrl}
                            alt={dest.name}
                            className="w-full h-40 object-cover"
                          />
                        )}
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <h3 className="text-lg font-bold text-gray-800 flex-1">{dest.name}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${statusColors[dest.status as keyof typeof statusColors]}`}>
                              {dest.status}
                            </span>
                          </div>
                          
                          {/* Trip and Share Status Badges */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {('tripId' in dest) && dest.tripId && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                                📍 {trips.find(t => t.id === dest.tripId)?.name || 'Loading...'}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                              ('public' in dest) && dest.public
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {('public' in dest) && dest.public ? "🌐 Public" : "🔒 Private"}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-sm">
                            {dest.place}, {dest.country}
                          </p>
                          {dest.description && <p className="text-gray-500 text-sm mt-2">{dest.description}</p>}
                          
                          {('urls' in dest) && dest.urls && dest.urls.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Links:</p>
                              <div className="space-y-1">
                                {dest.urls.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline block truncate"
                                  >
                                    {url}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {!isReference && 'id' in dest && (
                            <QuickFileLinks 
                              files={(() => {
                                const destFiles = files.filter(f => f.destinationId === dest.id);
                                // If destination is in a trip and user is a viewer on that trip, filter files
                                if (('tripId' in dest) && dest.tripId) {
                                  const trip = trips.find(t => t.id === dest.tripId);
                                  if (trip && isViewer(trip, session?.user?.email)) {
                                    return destFiles.filter(f => f.category === "picture" || f.category === "video");
                                  }
                                }
                                return destFiles;
                              })()} 
                            />
                          )}

                          <p className="text-xs text-gray-400 mt-3">Added by: {'addedBy' in dest ? dest.addedBy : 'Referenced'}</p>
                          
                          <div className="mt-3 pt-3 border-t flex justify-between items-center flex-wrap gap-2">
                            {isOwnItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePublic(dest.id);
                                }}
                                className={`px-3 py-1 text-sm rounded text-white font-semibold transition ${
                                  ('public' in dest) && dest.public
                                    ? "bg-green-500 hover:bg-green-600"
                                    : "bg-gray-500 hover:bg-gray-600"
                                }`}
                              >
                                {('public' in dest) && dest.public ? "🌐 Make Private" : "🔒 Make Public"}
                              </button>
                            )}
                            
                            {!isOwnItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddPublicItem(dest as ItemReference);
                                }}
                                className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                              >
                                ➕ Add
                              </button>
                            )}
                            
                            {isOwnItem && (
                              <>
                                <button
                                  onClick={() => handleVote(dest.id)}
                                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 flex items-center gap-1"
                                >
                                  👍 {'votes' in dest ? dest.votes : 0}
                                </button>
                                <Link href={`/destinations/${dest.id}`}>
                                  <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                                    Edit
                                  </button>
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  // Allow both authenticated and unauthenticated users
  const session = await getServerSession(context.req, context.res, authOptions);
  
  // Skip data fetching if Cosmos DB env vars are not available (build time)
  if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) {
    return {
      props: {
        initialDestinations: [],
        initialItemReferences: [],
      },
    };
  }

  // Let the client fetch destinations via the permission-aware API endpoint
  // This ensures proper permission checks (shows all to authenticated users, public only to anonymous)
  return {
    props: {
      initialDestinations: [],
      initialItemReferences: [],
    },
  };
};
