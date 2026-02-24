import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface UserPreferences {
  interests: string[];
  dislikes: string[];
  cuisinePreferences: string[];
  travelPace?: "slow" | "moderate" | "fast";
  budgetSensitivity?: "budget" | "moderate" | "luxury";
}

const INTEREST_OPTIONS = [
  "adventure",
  "culture",
  "food",
  "relaxation",
  "shopping",
  "history",
  "nature",
  "nightlife",
  "sports",
  "art",
  "photography",
  "wellness",
];

const DISLIKE_OPTIONS = [
  "crowds",
  "expensive",
  "touristy",
  "remote",
  "beach",
  "mountains",
  "desert",
  "rainforest",
  "very cold",
  "very hot",
];

export default function PreferencesPanel() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences>({
    interests: [],
    dislikes: [],
    cuisinePreferences: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (session?.user) {
      fetchPreferences();
    }
  }, [session]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences", {
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Failed to fetch preferences:", response.status);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setPreferences({
        interests: data.interests || [],
        dislikes: data.dislikes || [],
        cuisinePreferences: data.cuisinePreferences || [],
        travelPace: data.travelPace,
        budgetSensitivity: data.budgetSensitivity,
      });
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setMessage("Preferences saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Error saving preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage("Error saving preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setPreferences((prev) => ({
      ...prev,
      interests: (prev.interests || []).includes(interest)
        ? (prev.interests || []).filter((i) => i !== interest)
        : [...(prev.interests || []), interest],
    }));
  };

  const toggleDislike = (dislike: string) => {
    setPreferences((prev) => ({
      ...prev,
      dislikes: (prev.dislikes || []).includes(dislike)
        ? (prev.dislikes || []).filter((d) => d !== dislike)
        : [...(prev.dislikes || []), dislike],
    }));
  };

  if (loading) {
    return <div className="p-4">Loading preferences...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Travel Preferences</h2>

      {/* Interests Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Interests</h3>
        <p className="text-sm text-gray-600 mb-3">
          Select activities and experiences you enjoy
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                (preferences.interests || []).includes(interest)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Dislikes Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Things to Avoid</h3>
        <p className="text-sm text-gray-600 mb-3">
          Select experiences or conditions you prefer to avoid
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {DISLIKE_OPTIONS.map((dislike) => (
            <button
              key={dislike}
              onClick={() => toggleDislike(dislike)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                (preferences.dislikes || []).includes(dislike)
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {dislike}
            </button>
          ))}
        </div>
      </div>

      {/* Travel Pace */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Travel Pace</h3>
        <div className="flex gap-4">
          {(["slow", "moderate", "fast"] as const).map((pace) => (
            <button
              key={pace}
              onClick={() =>
                setPreferences((prev) => ({ ...prev, travelPace: pace }))
              }
              className={`px-4 py-2 rounded-lg font-medium transition ${
                preferences.travelPace === pace
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {pace === "slow"
                ? "Slow (few places)"
                : pace === "fast"
                  ? "Fast (many places)"
                  : "Moderate"}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Sensitivity */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Budget Level</h3>
        <div className="flex gap-4">
          {(["budget", "moderate", "luxury"] as const).map((level) => (
            <button
              key={level}
              onClick={() =>
                setPreferences((prev) => ({
                  ...prev,
                  budgetSensitivity: level,
                }))
              }
              className={`px-4 py-2 rounded-lg font-medium transition ${
                preferences.budgetSensitivity === level
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {level === "budget"
                ? "Budget"
                : level === "luxury"
                  ? "Luxury"
                  : "Moderate"}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          message.includes("Error")
            ? "bg-red-100 text-red-700"
            : "bg-green-100 text-green-700"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
