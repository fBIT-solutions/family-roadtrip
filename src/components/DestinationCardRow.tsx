import React, { useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import axios from "axios";
import { Destination, FileMetadata, Activity } from "@/types/schema";
import Link from "next/link";
import { toast } from "sonner";

interface DestinationCardRowProps {
  destination: Destination;
  files: FileMetadata[];
  activities: Activity[];
  onVoteChange?: (updatedDestination: Destination) => void;
}

export function DestinationCardRow({ destination, files, activities, onVoteChange }: DestinationCardRowProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [expandedDocs, setExpandedDocs] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState(false);
  const [expandedUrls, setExpandedUrls] = useState(false);
  const [destData, setDestData] = useState(destination);
  const [voting, setVoting] = useState(false);
  
  // Check if current user has voted
  const userHasVoted = destData.votedBy?.includes(session?.user?.email || "") || false;

  // Filter files for this destination (documents and tickets only)
  const destinationFiles = files.filter(
    (f) => f.destinationId === destination.id && !f.fileType.startsWith("image/") && !f.fileType.startsWith("video/")
  );

  // Filter activities for this destination
  const destinationActivities = activities.filter((a) => a.destinationId === destination.id);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session?.user?.email) {
      toast.error("You must be logged in to vote");
      return;
    }

    setVoting(true);
    try {
      const response = await axios.post(`/api/destinations/${destData.id}/vote`, {
        userEmail: session.user.email,
      });
      setDestData(response.data);
      if (onVoteChange) {
        onVoteChange(response.data);
      }
      toast.success(userHasVoted ? "Vote removed!" : "Vote added!");
    } catch (error) {
      console.error("Vote error:", error);
      toast.error("Failed to update vote");
    } finally {
      setVoting(false);
    }
  };

  const descriptionExcerpt = destination.description
    ? destination.description.substring(0, 100).trim() + (destination.description.length > 100 ? "..." : "")
    : "No description";

  return (
    <div
      onClick={() => router.push(`/destinations/${destination.id}`)}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer p-4 border border-gray-200 hover:border-blue-400"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {destination.mainPhotoUrl ? (
            <img
              src={destination.mainPhotoUrl}
              alt={destination.name}
              className="w-24 h-24 object-cover rounded"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-2xl">
              📍
            </div>
          )}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{destination.name}</h3>
              <p className="text-xs text-gray-600">
                {destination.place}, {destination.country}
              </p>
            </div>
            {destination.estimatedBudget && (
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-green-600">
                  {destination.currency || "EUR"} {destination.estimatedBudget}
                </p>
              </div>
            )}
          </div>

          {/* Description excerpt */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{descriptionExcerpt}</p>

          {/* Dropdowns and Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Documents Dropdown */}
            <div className="relative group">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedDocs(!expandedDocs);
                }}
                className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-300 hover:bg-yellow-200 transition"
              >
                📄 {destinationFiles.length > 0 ? `Docs (${destinationFiles.length})` : "No Docs"}
              </button>
              {expandedDocs && destinationFiles.length > 0 && (
                <div className="absolute z-10 left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg min-w-max">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {destinationFiles.map((file) => (
                      <a
                        key={file.id}
                        href={file.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded truncate"
                      >
                        {file.filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Activities Dropdown */}
            <div className="relative group">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedActivities(!expandedActivities);
                }}
                className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded border border-purple-300 hover:bg-purple-200 transition"
              >
                🎯 {destinationActivities.length > 0 ? `Activities (${destinationActivities.length})` : "No Activities"}
              </button>
              {expandedActivities && destinationActivities.length > 0 && (
                <div className="absolute z-10 left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg min-w-max">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {destinationActivities.map((activity) => (
                      <Link
                        key={activity.id}
                        href={`/activities/${activity.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="block w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded truncate">
                          {activity.name}
                        </button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* URLs Dropdown */}
            {destination.urls && destination.urls.length > 0 && (
              <div className="relative group">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedUrls(!expandedUrls);
                  }}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-300 hover:bg-blue-200 transition"
                >
                  🔗 {destination.urls.length} {destination.urls.length === 1 ? "Link" : "Links"}
                </button>
                {expandedUrls && (
                  <div className="absolute z-10 left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg min-w-max">
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {destination.urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded truncate max-w-xs"
                          title={url}
                        >
                          {url.replace(/^https?:\/\//, "").substring(0, 30)}...
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vote Button */}
            <button
              onClick={handleVote}
              disabled={voting}
              className={`px-2 py-1 text-xs rounded border transition ${
                userHasVoted
                  ? "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                  : "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
              } disabled:opacity-50`}
            >
              {userHasVoted ? "👎" : "👍"} {destData.votes || 0}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
