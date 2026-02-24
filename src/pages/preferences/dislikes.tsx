import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { RecommendationDislike } from "@/types/schema";

export default function DislikesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dislikes, setDislikes] = useState<RecommendationDislike[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "activity" | "destination">("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchDislikes();
    }
  }, [status]);

  const fetchDislikes = async () => {
    try {
      const response = await fetch("/api/recommendations/dislike");
      const data = await response.json();
      setDislikes(data.dislikes || []);
    } catch (error) {
      console.error("Error fetching dislikes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDislike = async (dislikeId: string) => {
    try {
      const response = await fetch("/api/recommendations/dislike", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dislikeId }),
      });

      if (response.ok) {
        setDislikes((prev) => prev.filter((d) => d.id !== dislikeId));
        alert("Dislike removed. You may see similar recommendations again.");
      }
    } catch (error) {
      console.error("Error removing dislike:", error);
      alert("Error removing dislike");
    }
  };

  const filteredDislikes = dislikes.filter(
    (d) => filter === "all" || d.type === filter
  );

  const dislikeStats = {
    total: dislikes.length,
    activities: dislikes.filter((d) => d.type === "activity").length,
    destinations: dislikes.filter((d) => d.type === "destination").length,
  };

  const tagCounts: Record<string, number> = {};
  dislikes.forEach((d) => {
    d.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dislikes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <a
            href="/preferences"
            className="inline-flex items-center text-red-600 hover:text-red-700 mb-4"
          >
            ← Back to Preferences
          </a>
          <h1 className="text-4xl font-bold text-gray-900">Disliked Items</h1>
          <p className="text-gray-600 mt-2">
            Manage items you've marked as not interested to refine recommendations
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-red-600">
              {dislikeStats.total}
            </div>
            <p className="text-gray-600 text-sm mt-2">Total Dislikes</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {dislikeStats.activities}
            </div>
            <p className="text-gray-600 text-sm mt-2">Activities</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {dislikeStats.destinations}
            </div>
            <p className="text-gray-600 text-sm mt-2">Destinations</p>
          </div>
        </div>

        {/* Top Reasons */}
        {Object.keys(tagCounts).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Reasons for Dislikes
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([tag, count]) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                  >
                    {tag} ({count})
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {(["all", "activity", "destination"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === f
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f === "all" ? "All" : f === "activity" ? "Activities" : "Destinations"}
            </button>
          ))}
        </div>

        {/* Dislikes List */}
        {filteredDislikes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No dislikes recorded yet.</p>
            <p className="text-gray-500 mt-2">
              Mark recommendations as "not interested" to see them here and get better suggestions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDislikes.map((dislike) => (
              <div
                key={dislike.id}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {dislike.name}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          dislike.type === "activity"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {dislike.type}
                      </span>
                      {dislike.category && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                          {dislike.category}
                        </span>
                      )}
                    </div>

                    {dislike.reason && (
                      <p className="text-sm text-gray-600 mb-2">{dislike.reason}</p>
                    )}

                    {dislike.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dislike.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(dislike.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveDislike(dislike.id)}
                    className="ml-4 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
