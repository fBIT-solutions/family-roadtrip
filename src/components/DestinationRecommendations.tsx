import React, { useState, useCallback } from "react";
import { DestinationRecommendation, Destination } from "@/types/schema";
import axios from "axios";
import DislikeButton from "./DislikeButton";

interface DestinationRecommendationsProps {
  budget: number;
  currency?: string;
  tripDurationDays?: number;
  interests?: string[];
  onAddDestination?: (destination: Partial<Destination>) => Promise<void>;
}

export function DestinationRecommendations({
  budget,
  currency = "EUR",
  tripDurationDays = 14,
  interests,
  onAddDestination,
}: DestinationRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<
    (DestinationRecommendation & { added?: boolean })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [extractedInterests, setExtractedInterests] = useState<string[]>([]);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/ai/recommend-destinations", {
        budget,
        currency,
        tripDurationDays,
        interests,
      });

      setRecommendations(response.data.recommendations);
      setExtractedInterests(response.data.userInterests);
      setShowRecommendations(true);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      alert("Failed to get recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [budget, currency, tripDurationDays, interests]);

  const handleAddDestination = useCallback(
    async (recommendation: DestinationRecommendation) => {
      if (!onAddDestination) return;

      try {
        await onAddDestination({
          name: recommendation.name,
          country: recommendation.country,
          place: recommendation.name,
          description: recommendation.description,
          latitude: recommendation.latitude,
          longitude: recommendation.longitude,
          estimatedBudget: recommendation.estimatedBudget,
          currency: recommendation.currency,
          urls: recommendation.sourceUrl ? [recommendation.sourceUrl] : [],
        });

        // Mark as added
        setRecommendations((prev) =>
          prev.map((r) =>
            r.id === recommendation.id ? { ...r, added: true } : r
          )
        );
      } catch (error) {
        console.error("Error adding destination:", error);
        alert("Failed to add destination. Please try again.");
      }
    },
    [onAddDestination]
  );

  if (!showRecommendations) {
    return (
      <button
        onClick={fetchRecommendations}
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
      >
        {loading ? "Generating..." : "✨ Get Destination Ideas"}
      </button>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gradient-to-b from-green-50 to-teal-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            🌍 AI-Recommended Destinations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Based on your interests:{" "}
            {extractedInterests.map((interest) => (
              <span
                key={interest}
                className="inline-block ml-2 px-2 py-1 bg-white rounded text-xs font-medium"
              >
                {interest}
              </span>
            ))}
          </p>
        </div>
        <button
          onClick={() => setShowRecommendations(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-3 rounded-lg border-2 ${
              rec.added
                ? "bg-green-50 border-green-300"
                : "bg-white border-green-200 hover:border-green-400"
            } transition-all`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">
                    {rec.name}, {rec.country}
                  </h4>
                </div>

                <p className="text-sm text-gray-700 mb-2">
                  {rec.description}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                  {rec.estimatedBudget && (
                    <span>
                      💰 {rec.currency} {rec.estimatedBudget}
                    </span>
                  )}
                  <span className="flex items-center">
                    ⭐ Match: {Math.round(rec.confidence * 100)}%
                  </span>
                  {rec.latitude && rec.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${rec.latitude},${rec.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      📍 View on Map
                    </a>
                  )}
                </div>

                <p className="text-xs text-green-700 mt-2 italic">
                  {rec.reason}
                </p>
              </div>

              <div className="ml-3 flex flex-col gap-2">
                {!rec.added && (
                  <button
                    onClick={() => handleAddDestination(rec)}
                    className="px-3 py-2 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition-colors whitespace-nowrap"
                  >
                    + Add
                  </button>
                )}
                {rec.added && (
                  <div className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded text-center">
                    ✓ Added
                  </div>
                )}
                <DislikeButton
                  recommendationId={rec.id}
                  type="destination"
                  name={`${rec.name}, ${rec.country}`}
                  tags={[]}
                  onDislike={() => {
                    // Remove from list when disliked
                    setRecommendations((prev) =>
                      prev.filter((r) => r.id !== rec.id)
                    );
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowRecommendations(false)}
        className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
      >
        Close Recommendations
      </button>
    </div>
  );
}
