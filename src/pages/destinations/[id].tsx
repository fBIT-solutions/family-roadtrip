import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { Destination } from "@/types/schema";

export default function EditDestination() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [mainPhotoUrl, setMainPhotoUrl] = useState("");
  const [urls, setUrls] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [destinationStatus, setDestinationStatus] = useState<"proposed" | "accepted" | "planned" | "visited">("proposed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && status === "authenticated") {
      fetchDestination();
    }
  }, [id, status]);

  const fetchDestination = async () => {
    try {
      const response = await axios.get(`/api/destinations/${id}`);
      setDestination(response.data);
      setName(response.data.name);
      setPlace(response.data.place || "");
      setCountry(response.data.country || "");
      setDescription(response.data.description || "");
      setMainPhotoUrl(response.data.mainPhotoUrl || "");
      setUrls(response.data.urls?.join("\n") || "");
      setLatitude(response.data.latitude?.toString() || "");
      setLongitude(response.data.longitude?.toString() || "");
      setDestinationStatus(response.data.status || "proposed");
    } catch (error) {
      console.error("Error fetching destination:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch coordinates from backend API when place/country changes
  const fetchCoordinates = useCallback(async (placeValue: string, countryValue: string) => {
    if (!placeValue && !countryValue) return;

    try {
      const response = await axios.get("/api/coordinates", {
        params: { place: placeValue, country: countryValue },
      });

      if (response.data.latitude && response.data.longitude) {
        setLatitude(response.data.latitude.toString());
        setLongitude(response.data.longitude.toString());
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
      if (place || country) {
        fetchCoordinates(place, country);
      }
    }, 500); // Debounce for 500ms to avoid excessive API calls

    return () => clearTimeout(timer);
  }, [place, country, fetchCoordinates]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const urlList = urls
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      await axios.put(`/api/destinations/${id}`, {
        name,
        place,
        country,
        description,
        mainPhotoUrl: mainPhotoUrl || undefined,
        urls: urlList,
        photos: mainPhotoUrl ? [{ url: mainPhotoUrl }] : [],
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        status: destinationStatus,
      });
      router.push("/destinations");
    } catch (error) {
      console.error("Error saving destination:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this destination?")) return;
    try {
      await axios.delete(`/api/destinations/${id}`);
      router.push("/destinations");
    } catch (error) {
      console.error("Error deleting destination:", error);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Destination not found</p>
      </div>
    );
  }

  const isOwner = session?.user?.email === destination.addedBy;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/destinations">
          <button className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900">← Back</button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          {isOwner ? "Edit" : "View"} Destination
        </h1>

        {!isOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">You can only edit destinations you created.</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          {mainPhotoUrl && (
            <img
              src={mainPhotoUrl}
              alt={name}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Place/City"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  disabled={!isOwner}
                  required
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!isOwner}
                  required
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={destinationStatus}
                onChange={(e) => setDestinationStatus(e.target.value as any)}
                disabled={!isOwner}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="proposed">Proposed</option>
                <option value="accepted">Accepted</option>
                <option value="planned">Planned</option>
                <option value="visited">Visited</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isOwner}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coordinates
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  disabled={!isOwner}
                  step="0.0001"
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  disabled={!isOwner}
                  step="0.0001"
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Main Photo URL
              </label>
              <input
                type="url"
                value={mainPhotoUrl}
                onChange={(e) => setMainPhotoUrl(e.target.value)}
                disabled={!isOwner}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Useful URLs (one per line)
              </label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                disabled={!isOwner}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 h-24 font-mono text-sm"
              />
            </div>

            {isOwner && (
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500">
              Added by: {destination.addedBy}
            </p>
            <p className="text-sm text-gray-500">
              Votes: {destination.votes}
            </p>
            <p className="text-sm text-gray-500">
              Status: {destination.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
