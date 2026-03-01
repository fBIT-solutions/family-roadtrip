import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "sonner";
import { TravelerRequest, Trip } from "@/types/schema";
import Link from "next/link";

export default function RequestsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState<TravelerRequest[]>([]);
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchRequests();
    }
  }, [router.isReady, status]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get("/api/traveler-requests/user");
      setRequests(response.data);

      // Fetch trip details for each request
      const tripIds = new Set(response.data.map((r: TravelerRequest) => r.tripId) as string[]);
      const tripMap: Record<string, Trip> = {};

      for (const tripId of tripIds) {
        try {
          const tripResponse = await axios.get(`/api/trips/${tripId}`);
          tripMap[tripId as string] = tripResponse.data.trip;
        } catch (error) {
          console.error(`Failed to fetch trip ${tripId}:`, error);
        }
      }

      setTrips(tripMap);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "approved":
        return "bg-green-100 text-green-800 border border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Your request is pending. The trip owner will review it soon.";
      case "approved":
        return "✅ Approved! You are now a traveler on this trip and have full access.";
      case "rejected":
        return "❌ Your request was rejected. You remain a guest on this trip.";
      default:
        return "";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Traveler Requests</h1>
            <Link href="/">
              <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                ← Back Home
              </button>
            </Link>
          </div>
          <p className="text-gray-600 mt-2">
            View the status of your requests to become a traveler on trips
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              You haven't submitted any traveler requests yet.
            </p>
            <p className="text-gray-500 text-sm">
              When you try to vote on a destination as a guest, you can request traveler access.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const trip = trips[request.tripId];
              return (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">
                        {trip?.name || "Loading..."}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Trip ID: {request.tripId}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusBadgeColor(
                        request.status
                      )}`}
                    >
                      {request.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Status Message */}
                  <div className="bg-gray-50 rounded p-4 mb-4 border border-gray-200">
                    <p className="text-gray-700">{getStatusMessage(request.status)}</p>
                  </div>

                  {/* Request Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Requested</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Trip Owner</p>
                      <p className="font-semibold text-gray-800 break-all">
                        {request.ownerId}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  {request.status === "approved" && (
                    <div className="mt-4">
                      <Link href={`/trips/${request.tripId}`}>
                        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                          View Trip
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
