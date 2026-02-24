import React, { useState, useCallback } from "react";
import { Activity, ActivityRecommendation } from "@/types/schema";
import axios from "axios";
import DislikeButton from "./DislikeButton";

interface ActivityRecommendationsProps {
  destinationId: string;
  destinationName: string;
  budget: number;
  currency?: string;
  onAddActivity?: (activity: Partial<Activity>) => Promise<void>;
}

const CategoryBadgeColors: Record<string, string> = {
  outdoor: "bg-green-100 text-green-800",
  cultural: "bg-purple-100 text-purple-800",
  food: "bg-orange-100 text-orange-800",
  nightlife: "bg-pink-100 text-pink-800",
  shopping: "bg-blue-100 text-blue-800",
  sports: "bg-red-100 text-red-800",
  relaxation: "bg-cyan-100 text-cyan-800",
  adventure: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800",
};

export function ActivityRecommendations({
  destinationId,
  destinationName,
  budget,
  currency = "EUR",
  onAddActivity,
}: ActivityRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<
    (ActivityRecommendation & { added?: boolean })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/ai/recommend-activities", {
        destinationId,
        budget,
        currency,
      });

      setRecommendations(response.data.recommendations);
      setUserInterests(response.data.userInterests);
      setShowRecommendations(true);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      alert("Failed to get recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [destinationId, budget, currency]);

  const handleAddActivity = useCallback(
    async (recommendation: ActivityRecommendation) => {
      if (!onAddActivity) return;

      try {
        await onAddActivity({
          name: recommendation.name,
          description: recommendation.description,
          category: recommendation.category,
          estimatedCost: recommendation.estimatedCost,
          currency: recommendation.currency,
          duration: recommendation.duration,
          destinationId,
        });

        // Mark as added
        setRecommendations((prev) =>
          prev.map((r) =>
            r.id === recommendation.id ? { ...r, added: true } : r
          )
        );
      } catch (error) {
        console.error("Error adding activity:", error);
        alert("Failed to add activity. Please try again.");
      }
    },
    [destinationId, onAddActivity]
  );

  if (!showRecommendations) {
    return (
      <button
        onClick={fetchRecommendations}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
      >
        {loading ? "Generating..." : "✨ Get AI Recommendations"}
      </button>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gradient-to-b from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            🤖 AI-Recommended Activities for {destinationName}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Based on your interests:{" "}
            {userInterests.map((interest) => (
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
                : "bg-white border-blue-200 hover:border-blue-400"
            } transition-all`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{rec.name}</h4>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      CategoryBadgeColors[rec.category] ||
                      CategoryBadgeColors.other
                    }`}
                  >
                    {rec.category}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-2">
                  {rec.description}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {rec.estimatedCost && (
                    <span>
                      💰 {rec.currency} {rec.estimatedCost}
                    </span>
                  )}
                  {rec.duration && <span>⏱️ {rec.duration}</span>}
                  <span className="flex items-center">
                    ⭐ Match: {Math.round(rec.confidence * 100)}%
                  </span>
                </div>

                <p className="text-xs text-purple-700 mt-2 italic">
                  {rec.reason}
                </p>
              </div>

              <div className="ml-3 flex flex-col gap-2">
                {!rec.added && (
                  <button
                    onClick={() => handleAddActivity(rec)}
                    className="px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition-colors whitespace-nowrap"
                  >
                    + Add
                  </button>
                )}
                {rec.added && (
                  <div className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded text-center">
                    ✓ Added
                  </div>
                )}
                <DislikeButton
                  recommendationId={rec.id}
                  type="activity"
                  name={rec.name}
                  category={rec.category}
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
