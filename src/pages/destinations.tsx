import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import axios from "axios";
import { Destination, FileMetadata } from "@/types/schema";
import { DestinationMap } from "@/components/DestinationMap";
import { DestinationRecommendations } from "@/components/DestinationRecommendations";
import { QuickFileLinks } from "@/components/QuickFileLinks";
import * as destinationApi from "@/api/destinations";

const statusColors: Record<string, string> = {
  proposed: "bg-indigo-100 text-indigo-800",
  accepted: "bg-amber-100 text-amber-800",
  planned: "bg-blue-100 text-blue-800",
  visited: "bg-emerald-100 text-emerald-800",
};

export default function Destinations({
  initialDestinations = [],
}: {
  initialDestinations?: Destination[];
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [newName, setNewName] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newUrls, setNewUrls] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newLatitude, setNewLatitude] = useState("");
  const [newLongitude, setNewLongitude] = useState("");
  const [newStatus, setNewStatus] = useState<"proposed" | "accepted" | "planned" | "visited">("proposed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [files, setFiles] = useState<FileMetadata[]>([]);

  const fetchDestinations = useCallback(async () => {
    try {
      const [destRes, filesRes] = await Promise.all([
        axios.get("/api/destinations", { withCredentials: true }),
        axios.get("/api/files", { withCredentials: true }),
      ]);
      setDestinations(destRes.data);
      setFiles(filesRes.data);
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

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Link href="/">
          <button className="mb-4 px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900">← Back</button>
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">🌍 Destinations</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/preferences" className="flex-1 sm:flex-initial">
              <button className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition">
                ⚙️ Preferences
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
            <DestinationMap destinations={destinations} />
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div>
            {loading ? (
              <p className="text-center text-gray-600">Loading destinations...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {destinations.length === 0 ? (
                  <p className="col-span-full text-center text-gray-600">No destinations yet. Be the first to suggest one!</p>
                ) : (
                  destinations.map((dest) => (
                    <div
                      key={dest.id}
                      onClick={() => router.push(`/destinations/${dest.id}`)}
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
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold text-gray-800 flex-1">{dest.name}</h3>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${statusColors[dest.status]}`}>
                            {dest.status}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {dest.place}, {dest.country}
                        </p>
                        {dest.description && <p className="text-gray-500 text-sm mt-2">{dest.description}</p>}
                        
                        {dest.urls && dest.urls.length > 0 && (
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

                        <QuickFileLinks 
                          files={files.filter(f => f.destinationId === dest.id)} 
                        />

                        <p className="text-xs text-gray-400 mt-3">Added by: {dest.addedBy}</p>
                        
                        <div className="mt-3 pt-3 border-t flex justify-between items-center">
                          <button
                            onClick={() => handleVote(dest.id)}
                            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 flex items-center gap-1"
                          >
                            👍 {dest.votes}
                          </button>
                          <Link href={`/destinations/${dest.id}`}>
                            <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                              Edit
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
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
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    // Redirect to login if not authenticated
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(context.req.url || "/destinations")}`,
        permanent: false,
      },
    };
  }

  // Skip data fetching if Cosmos DB env vars are not available (build time)
  if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) {
    return {
      props: {
        initialDestinations: [],
      },
    };
  }

  try {
    const initialDestinations = await destinationApi.getDestinations();
    // Convert Date objects to ISO strings for serialization
    const serializedDestinations = initialDestinations.map((dest) => ({
      ...dest,
      createdAt: dest.createdAt?.toISOString?.() || dest.createdAt,
      updatedAt: dest.updatedAt?.toISOString?.() || dest.updatedAt,
    }));
    return {
      props: {
        initialDestinations: serializedDestinations,
      },
    };
  } catch (error) {
    console.error("Error fetching destinations in getServerSideProps:", error);
    // Return empty list if fetch fails
    return {
      props: {
        initialDestinations: [],
      },
    };
  }
};