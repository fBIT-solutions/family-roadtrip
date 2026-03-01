import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { TravelerRequest } from "@/types/schema";

interface TravelerRequestsModalProps {
  tripId: string;
  tripOwnerEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (request: TravelerRequest) => void;
}

export function TravelerRequestsModal({
  tripId,
  tripOwnerEmail,
  isOpen,
  onClose,
  onApprove,
}: TravelerRequestsModalProps) {
  const [requests, setRequests] = useState<TravelerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, tripId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/trips/${tripId}/traveler-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      const response = await axios.post(
        `/api/traveler-requests/${requestId}?action=approve`
      );
      toast.success("Request approved! User is now a traveler.");
      
      // Update local state
      setRequests(requests.map((r) =>
        r.id === requestId ? response.data : r
      ));

      // Callback for parent component to refresh trip data
      if (onApprove) {
        const approvedRequest = requests.find((r) => r.id === requestId);
        if (approvedRequest) {
          onApprove(response.data);
        }
      }
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(error?.response?.data?.error || "Failed to approve request");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionInProgress(requestId);
    try {
      const response = await axios.post(
        `/api/traveler-requests/${requestId}?action=reject`
      );
      toast.success("Request rejected.");
      
      // Update local state
      setRequests(requests.map((r) =>
        r.id === requestId ? response.data : r
      ));
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(error?.response?.data?.error || "Failed to reject request");
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Traveler Requests</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No requests yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                    {pendingRequests.length} Pending
                  </span>
                </h4>
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-yellow-300 rounded-lg p-4 bg-yellow-50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            {request.requesterName}
                          </h5>
                          <p className="text-sm text-gray-600 break-all">
                            {request.requesterEmail}
                          </p>
                        </div>
                        <span className="text-xs text-gray-600">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={actionInProgress === request.id}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionInProgress === request.id ? "Processing..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionInProgress === request.id}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionInProgress === request.id ? "Processing..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Processed Requests
                </h4>
                <div className="space-y-3">
                  {processedRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`border rounded-lg p-3 ${
                        request.status === "approved"
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-gray-800 text-sm">
                            {request.requesterName}
                          </h5>
                          <p className="text-xs text-gray-600 break-all">
                            {request.requesterEmail}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded font-semibold ${
                            request.status === "approved"
                              ? "bg-green-200 text-green-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
          {requests.length > 0 && (
            <button
              onClick={fetchRequests}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
