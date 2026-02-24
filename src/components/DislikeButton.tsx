import React, { useState } from "react";

interface DislikeButtonProps {
  recommendationId: string;
  type: "activity" | "destination";
  name: string;
  category?: string;
  tags?: string[];
  onDislike?: () => void;
}

export default function DislikeButton({
  recommendationId,
  type,
  name,
  category,
  tags = [],
  onDislike,
}: DislikeButtonProps) {
  const [isDisliking, setIsDisliking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const availableTags = [
    "crowded",
    "expensive",
    "touristy",
    "boring",
    "too adventurous",
    "not adventurous enough",
    "bad food",
    "bad weather",
    "too far",
  ];

  const handleDislike = async () => {
    if (!selectedTags.length && !reason) {
      alert("Please select at least one reason or add a comment");
      return;
    }

    setIsDisliking(true);
    try {
      const response = await fetch("/api/recommendations/dislike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          recommendationId,
          name,
          category,
          reason,
          tags: selectedTags,
        }),
      });

      if (response.ok) {
        alert(`Marked "${name}" as disliked. We'll avoid similar recommendations.`);
        setShowForm(false);
        setReason("");
        setSelectedTags([]);
        onDislike?.();
      } else {
        alert("Error saving dislike");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error saving dislike");
    } finally {
      setIsDisliking(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
          title="Mark this as disliked to get better recommendations"
        >
          👎 Not interested
        </button>
      ) : (
        <div className="bg-red-50 p-3 rounded-lg border border-red-200 mt-2">
          <h4 className="font-semibold text-sm mb-2">Why not interested?</h4>

          {/* Tag Selection */}
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Select reasons:</p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    selectedTags.includes(tag)
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Reason */}
          <div className="mb-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: Add more details..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-red-500"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDislike}
              disabled={isDisliking}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition"
            >
              {isDisliking ? "Saving..." : "Confirm"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setReason("");
                setSelectedTags([]);
              }}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
