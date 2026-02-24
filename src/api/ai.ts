import { containers } from "@/lib/cosmosdb";
import {
  ActivityRecommendation,
  DestinationRecommendation,
  RecommendationCache,
  Activity,
  Destination,
} from "@/types/schema";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// Initialize Vertex AI REST API
const project = process.env.GOOGLE_CLOUD_PROJECT || "";
const location = process.env.GOOGLE_CLOUD_LOCATION || "global";
const apiKey = process.env.GOOGLE_CLOUD_API_KEY || "";
const model = process.env.GOOGLE_CLOUD_MODEL || "gemini-2.5-flash";

// Construct endpoint - handles both global and regional endpoints
const getEndpoint = () => {
  if (location === "global") {
    return `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent`;
  }
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
};

/**
 * Call Vertex AI Gemini API via REST
 */
async function callVertexAI(prompt: string): Promise<string> {
  if (!apiKey || !project) {
    throw new Error("Missing GOOGLE_CLOUD_API_KEY or GOOGLE_CLOUD_PROJECT environment variables");
  }

  try {
    const endpoint = getEndpoint();
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: {
            text: "You are a travel recommendation expert. When asked to suggest activities or destinations, you MUST return EXACTLY the number requested (3 items). Return complete, detailed information in JSON format. Do not truncate responses. Always include all requested fields with full descriptions.",
          },
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.4,
          topK: 10,
          topP: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Vertex AI HTTP error:", error);
      throw new Error(`Vertex AI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log("Vertex AI response structure:", {
      hasData: !!data,
      hasCandidates: !!data.candidates,
      candidateCount: data.candidates?.length || 0,
      firstCandidate: data.candidates?.[0] ? {
        hasContent: !!data.candidates[0].content,
        hasParts: !!data.candidates[0].content?.parts,
        partCount: data.candidates[0].content?.parts?.length || 0,
      } : null,
    });

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("No content extracted from Vertex AI response");
      console.error("Full response:", JSON.stringify(data, null, 2));
      throw new Error("No content in Vertex AI response");
    }

    console.log("Vertex AI content length:", content.length, "bytes");
    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error calling Vertex AI:", message);
    throw error;
  }
}

/**
 * Generate a cache key from request parameters
 */
function generateCacheKey(type: string, params: Record<string, any>): string {
  const sortedParams = JSON.stringify(params, Object.keys(params).sort());
  const hash = crypto.createHash("sha256").update(sortedParams).digest("hex");
  return `${type}:${hash}`;
}

/**
 * Get cached recommendations and the cache document for updating
 */
async function getCachedRecommendations(
  type: "activity" | "destination",
  cacheKey: string
): Promise<{ recommendations: any[]; cacheDoc?: RecommendationCache } | null> {
  try {
    const container = type === "activity" ? containers.recommendActivities : containers.recommendDestinations;
    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.cacheKey = @key AND c.expiresAt > GetCurrentTimestamp()",
        parameters: [{ name: "@key", value: cacheKey }],
      })
      .fetchAll();

    if (resources && resources.length > 0) {
      const cacheDoc = resources[0] as RecommendationCache;
      console.log(`Cache hit for ${cacheKey} - found ${cacheDoc.recommendations?.length || 0} recommendations`);
      return {
        recommendations: cacheDoc.recommendations as any[],
        cacheDoc,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting cached recommendations:", error);
    return null;
  }
}

/**
 * Merge new recommendations with cached ones and update cache
 */
async function mergeAndCacheRecommendations(
  type: "activity" | "destination",
  cacheKey: string,
  userId: string,
  newRecommendations: ActivityRecommendation[] | DestinationRecommendation[],
  cacheDoc?: RecommendationCache
): Promise<void> {
  try {
    const container = type === "activity" ? containers.recommendActivities : containers.recommendDestinations;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Merge with existing recommendations, removing duplicates by name
    let allRecommendations: any[] = newRecommendations;
    if (cacheDoc?.recommendations) {
      const newNames = new Set(newRecommendations.map((r: any) => r.name));
      const existingUnique = cacheDoc.recommendations.filter((r: any) => !newNames.has(r.name));
      allRecommendations = [...newRecommendations, ...existingUnique];
    }

    const cache: RecommendationCache = {
      id: cacheDoc?.id || uuidv4(),
      type,
      userId,
      cacheKey,
      recommendations: allRecommendations,
      expiresAt: thirtyDaysFromNow,
      createdAt: cacheDoc?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (cacheDoc?.id) {
      // Update existing cache entry
      await container.item(cacheDoc.id, cacheDoc.id).replace(cache);
      console.log(`Updated cache for ${cacheKey} - now ${allRecommendations.length} total recommendations`);
    } else {
      // Create new cache entry
      await container.items.create(cache);
      console.log(`Created cache for ${cacheKey} - ${newRecommendations.length} recommendations`);
    }
  } catch (error) {
    console.error("Error updating cache:", error);
    // Don't fail if caching fails
  }
}

/**
 * Get user preferences and dislikes for better recommendation tailoring
 */
async function getUserPreferencesAndDislikes(userId: string): Promise<{
  preferences: any;
  dislikedNames: string[];
  dislikedCategories: string[];
  dislikedTags: string[];
}> {
  try {
    // Get user preferences
    const { resources: prefResources } = await containers.userPreferences.items
      .query({
        query: "SELECT * FROM c WHERE c.userId = @userId",
        parameters: [{ name: "@userId", value: userId }],
      })
      .fetchAll();

    const preferences = prefResources?.[0] || {};

    // Get all user dislikes
    const { resources: dislikeResources } = await containers.recommendationDislikes.items
      .query({
        query: "SELECT * FROM c WHERE c.userId = @userId",
        parameters: [{ name: "@userId", value: userId }],
      })
      .fetchAll();

    const dislikedNames = dislikeResources.map((d: any) => d.name);
    const dislikedCategories = [
      ...new Set(
        dislikeResources
          .filter((d: any) => d.category)
          .map((d: any) => d.category)
      ),
    ];
    const dislikedTags = [
      ...new Set(
        dislikeResources
          .flatMap((d: any) => d.tags || [])
      ),
    ];

    return {
      preferences,
      dislikedNames,
      dislikedCategories,
      dislikedTags,
    };
  } catch (error) {
    console.error("Error getting user preferences:", error);
    return {
      preferences: {},
      dislikedNames: [],
      dislikedCategories: [],
      dislikedTags: [],
    };
  }
}

/**
 * Parse JSON response from Vertex AI - with robust error handling and fallback closing
 */
function parseVertexResponse<T>(text: string): T[] {
  try {
    console.log("parseVertexResponse input - length:", text.length, "first 200 chars:", text.substring(0, 200));
    
    // Clean up the text - remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    console.log("After cleanup - length:", cleaned.length);

    // Try to extract JSON array
    const arrayStart = cleaned.indexOf("[");
    if (arrayStart === -1) {
      console.error("No JSON array found in response");
      return [];
    }

    // Find the matching closing bracket, respecting string boundaries
    let bracketCount = 0;
    let jsonEnd = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = arrayStart; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "[") {
          bracketCount++;
        } else if (char === "]") {
          bracketCount--;
          if (bracketCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
    }

    let jsonStr: string;
    if (jsonEnd === -1) {
      console.warn("Incomplete JSON array - attempting to auto-close");
      console.warn("String context - inString:", inString, "bracketCount:", bracketCount);
      console.warn("Response ends with:", cleaned.substring(Math.max(0, cleaned.length - 100)));
      
      // Try to close the incomplete JSON
      jsonStr = cleaned.substring(arrayStart);
      
      // If we're in a string, close it first
      if (inString) {
        jsonStr += '"';
      }
      
      // Close any open objects/arrays
      while (bracketCount > 0) {
        jsonStr += "}";
        bracketCount--;
      }
      jsonStr += "]";
      
      console.log("Auto-closed JSON - new length:", jsonStr.length);
    } else {
      jsonStr = cleaned.substring(arrayStart, jsonEnd + 1);
    }

    console.log("Extracted JSON length:", jsonStr.length, "First 200:", jsonStr.substring(0, 200), "Last 100:", jsonStr.substring(Math.max(0, jsonStr.length - 100)));
    
    const parsed = JSON.parse(jsonStr) as T[];
    console.log("Successfully parsed", parsed.length, "items");
    return parsed;
  } catch (error) {
    console.error("Error parsing Vertex AI response:", error);
    console.error("Response text (first 500 chars):", text.substring(0, 500));
    return [];
  }
}

/**
 * Recommend activities for a specific destination
 */
export async function recommendActivities(
  destination: Destination,
  interests: string[],
  budget: number,
  currency: string = "EUR",
  userId?: string,
  userPreferences?: any
): Promise<ActivityRecommendation[]> {
  try {
    console.log("recommendActivities called:", { destination: destination.name, interests, budget });
    const cacheKey = generateCacheKey("activity", {
      destinationId: destination.id,
      interests: interests.sort(),
      budget,
    });

    // Check cache first
    const cacheResult = await getCachedRecommendations("activity", cacheKey);
    if (cacheResult?.recommendations && cacheResult.recommendations.length > 0) {
      console.log("Returning cached recommendations:", cacheResult.recommendations.length, "items");
      return cacheResult.recommendations as ActivityRecommendation[];
    }

    // Extract already-recommended activity names to exclude from new suggestions
    const cachedActivityNames = cacheResult?.cacheDoc?.recommendations
      ?.map((a: any) => a.name)
      .join(", ") || "None";

    // Fetch existing activities for this destination
    let existingActivities: Activity[] = [];
    try {
      const { resources } = await containers.activities.items
        .query({
          query: "SELECT * FROM c WHERE c.destinationId = @destId",
          parameters: [{ name: "@destId", value: destination.id }],
        })
        .fetchAll();
      existingActivities = resources as Activity[];
    } catch (e) {
      console.log("No existing activities found");
    }

    let existingActivityNamesList = existingActivities.map((a) => a.name);
    
    // Include explicitly passed existing activities from endpoint
    if (userPreferences?.existingActivityNames && Array.isArray(userPreferences.existingActivityNames)) {
      existingActivityNamesList = [...new Set([...existingActivityNamesList, ...userPreferences.existingActivityNames])];
    }

    const existingActivityNames = existingActivityNamesList.join(", ");

    // Get user preferences and dislikes
    let { preferences, dislikedNames, dislikedCategories, dislikedTags } = userId
      ? await getUserPreferencesAndDislikes(userId)
      : { preferences: {}, dislikedNames: [], dislikedCategories: [], dislikedTags: [] };

    // Merge with passed-in preferences
    if (userPreferences) {
      preferences = { ...preferences, ...userPreferences };
      if (userPreferences.dislikes && userPreferences.dislikes.length > 0) {
        dislikedNames = [...new Set([...dislikedNames, ...userPreferences.dislikes])];
      }
      if (userPreferences.cuisinePreferences && userPreferences.cuisinePreferences.length > 0) {
        dislikedTags = [...new Set([...dislikedTags, ...userPreferences.cuisinePreferences])];
      }
    }

    // Build exclusions list
    const excludedItems = [...new Set([
      ...cachedActivityNames.split(",").filter(n => n.trim()),
      ...dislikedNames,
    ])].filter(n => n).join(", ");

    const excludedCategories = dislikedCategories.length > 0 ? dislikedCategories.join(", ") : "None";
    const preferredInterests = (preferences?.interests?.length > 0 
      ? preferences.interests.join(", ") 
      : interests.join(", "));

    const cuisineNote = preferences?.cuisinePreferences && preferences.cuisinePreferences.length > 0
      ? `Preferred cuisines: ${preferences.cuisinePreferences.join(", ")}\n`
      : "";

    // Simplified prompt to ensure we get complete responses
    const prompt = `Return EXACTLY 3 unique activities in JSON format.

Location: ${destination.name}
Interests: ${preferredInterests}
Budget: ${currency}${budget} max per activity
AVOID: ${excludedItems || "None"}
AVOID categories: ${excludedCategories}
AVOID items with: ${dislikedTags.join(", ") || "None"}
Already planned: ${existingActivityNames || "None"}
${cuisineNote}

Return 3 complete activities as JSON array:
[{"name":"Activity","description":"What to do and see in 1-2 sentences","category":"outdoor|cultural|food|shopping|relaxation","estimatedCost":45,"currency":"${currency}","duration":"2-3 hours","sourceUrl":"https://maps.google.com/search/...","confidence":0.85,"reason":"Why it fits interests"},...]

MUST RETURN ALL 3. All fields required. Include sourceUrl as valid URL (Google Maps, TripAdvisor, or official website). Complete info only.`;

    console.log("Activity recommendation prompt length:", prompt.length, "chars");
    
    // Retry logic: try up to 2 times to get 3+ items
    let recommendations: ActivityRecommendation[] = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const text = await callVertexAI(prompt);
      console.log(`Activity response attempt ${attempt} (raw):`, text.substring(0, 200), "...");

      recommendations = parseVertexResponse<ActivityRecommendation>(text).map(
        (rec) => ({
          ...rec,
          id: uuidv4(),
          createdAt: new Date(),
        })
      );

      console.log(`Activity recommendations parsed (attempt ${attempt}):`, recommendations.length, "items");

      // If we got 3 or more, good to go
      if (recommendations.length >= 3) {
        console.log(`Success: Got ${recommendations.length} items on attempt ${attempt}`);
        break;
      }

      // If we got less than 3 on first attempt, wait and retry
      if (attempt === 1 && recommendations.length < 3) {
        console.log(`Only got ${recommendations.length} items, retrying...`);
        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Ensure we have recommendations even if retry failed
    if (recommendations.length === 0) {
      console.warn("No recommendations parsed, returning empty array");
      return [];
    }

    // Merge with cache and update
    if (userId && recommendations.length > 0) {
      console.log("Merging", recommendations.length, "new recommendations with cache");
      await mergeAndCacheRecommendations("activity", cacheKey, userId, recommendations, cacheResult?.cacheDoc);
    }

    // Return merged result (new + cached)
    const mergedRecommendations = [...recommendations];
    if (cacheResult?.cacheDoc?.recommendations) {
      const newNames = new Set(recommendations.map((r) => r.name));
      const existingUnique = (cacheResult.cacheDoc.recommendations as any[]).filter(
        (r: any) => !newNames.has(r.name)
      );
      mergedRecommendations.push(...existingUnique);
      console.log(`Merged: ${recommendations.length} new + ${existingUnique.length} cached = ${mergedRecommendations.length} total`);
    } else {
      console.log(`No cached recommendations. Returning ${mergedRecommendations.length} new items.`);
    }

    return mergedRecommendations;
  } catch (error) {
    console.error("Error recommending activities:", error);
    return [];
  }
}

/**
 * Recommend destinations based on user interests
 */
export async function recommendDestinations(
  interests: string[],
  budget: number,
  currency: string = "EUR",
  tripDurationDays: number = 14,
  userId?: string,
  tripDurationMin: number = 1,
  tripDurationMax: number = 3,
  userPreferences?: any
): Promise<DestinationRecommendation[]> {
  try {
    console.log("recommendDestinations called:", { interests, budget, tripDurationDays, tripDurationMin, tripDurationMax });
    const cacheKey = generateCacheKey("destination", {
      interests: interests.sort(),
      budget,
      duration: tripDurationDays,
    });

    // Check cache first
    const cacheResult = await getCachedRecommendations("destination", cacheKey);
    if (cacheResult?.recommendations && cacheResult.recommendations.length > 0) {
      console.log("Returning cached recommendations:", cacheResult.recommendations.length, "items");
      return cacheResult.recommendations as DestinationRecommendation[];
    }

    // Extract already-recommended destination names to exclude from new suggestions
    const cachedDestNames = cacheResult?.cacheDoc?.recommendations
      ?.map((d: any) => `${d.name}, ${d.country}`)
      .join("; ") || "None";

    // Fetch existing destinations already in trip
    let existingDestinations: Destination[] = [];
    try {
      const { resources } = await containers.destinations.items
        .query("SELECT * FROM c WHERE c.status != 'rejected'")
        .fetchAll();
      existingDestinations = resources as Destination[];
    } catch (e) {
      console.log("No existing destinations found");
    }

    let existingDestList = existingDestinations.map((d) => `${d.name}, ${d.country}`);
    
    // Include explicitly passed existing destinations from endpoint
    if (userPreferences?.existingDestinations && Array.isArray(userPreferences.existingDestinations)) {
      const passedDestNames = userPreferences.existingDestinations.map((d: any) => `${d.name}, ${d.country}`);
      existingDestList = [...new Set([...existingDestList, ...passedDestNames])];
    }

    const existingDests = existingDestList.join("; ");
    const budgetPerDay = budget / tripDurationDays;

    // Get user preferences and dislikes
    let { preferences, dislikedNames, dislikedCategories, dislikedTags } = userId
      ? await getUserPreferencesAndDislikes(userId)
      : { preferences: {}, dislikedNames: [], dislikedCategories: [], dislikedTags: [] };

    // Merge with passed-in preferences
    if (userPreferences) {
      preferences = { ...preferences, ...userPreferences };
      if (userPreferences.dislikes && userPreferences.dislikes.length > 0) {
        dislikedNames = [...new Set([...dislikedNames, ...userPreferences.dislikes])];
      }
      if (userPreferences.cuisinePreferences && userPreferences.cuisinePreferences.length > 0) {
        dislikedTags = [...new Set([...dislikedTags, ...userPreferences.cuisinePreferences])];
      }
    }

    // Build exclusions list
    const excludedDests = [...new Set([
      ...cachedDestNames.split(";").filter(n => n.trim()),
      ...dislikedNames,
    ])].filter(n => n).join("; ");

    const travelPaceNote = preferences?.travelPace 
      ? `Travel pace: ${preferences.travelPace} (${preferences.travelPace === 'slow' ? 'stay longer in fewer places' : preferences.travelPace === 'fast' ? 'visit many places' : 'balanced'})`
      : "";
    
    const budgetSenseNote = preferences?.budgetSensitivity
      ? `Accommodation: ${preferences.budgetSensitivity === 'budget' ? 'budget hostels/guesthouses' : preferences.budgetSensitivity === 'luxury' ? 'luxury hotels' : 'mid-range'}`
      : "";

    const cuisineNote = preferences?.cuisinePreferences && preferences.cuisinePreferences.length > 0
      ? `Preferred cuisines: ${preferences.cuisinePreferences.join(", ")}`
      : "";

    const preferredInterests = (preferences?.interests?.length > 0 
      ? preferences.interests.join(", ") 
      : interests.join(", "));

    // Simplified prompt to ensure we get complete responses
    const prompt = `Return EXACTLY 3 unique travel destinations in JSON format.

Criteria:
- Interests: ${preferredInterests}
- Trip: 2-week planning, ${tripDurationMin}-${tripDurationMax} days per place
- Budget: ${currency}${budget} total (${currency}${budgetPerDay.toFixed(0)}/day)
- AVOID: ${excludedDests || "None"}
- AVOID categories: ${dislikedCategories.join(", ") || "None"}
- AVOID items with: ${dislikedTags.join(", ") || "None"}
- Already going: ${existingDests || "None"}
${travelPaceNote}
${budgetSenseNote}
${cuisineNote}

Return 3 complete destinations as JSON array:
[{"name":"City","country":"Country","description":"Why perfect for interests","latitude":0.0,"longitude":0.0,"sourceUrl":"https://en.wikipedia.org/wiki/...","confidence":0.9,"reason":"How it fits budget/interests","estimatedBudget":800,"currency":"${currency}"},...]

MUST RETURN ALL 3. All fields required. Include sourceUrl as Wikipedia/tourism board URL. Complete info only.`;

    console.log("Destination recommendation prompt length:", prompt.length, "chars");
    
    // Retry logic: try up to 2 times to get 3+ items
    let recommendations: DestinationRecommendation[] = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const text = await callVertexAI(prompt);
      console.log(`Destination response attempt ${attempt} (raw):`, text.substring(0, 200), "...");

      recommendations = parseVertexResponse<DestinationRecommendation>(text).map((rec) => ({
        ...rec,
        id: uuidv4(),
        createdAt: new Date(),
      }));

      console.log(`Destination recommendations parsed (attempt ${attempt}):`, recommendations.length, "items");

      // If we got 3 or more, good to go
      if (recommendations.length >= 3) {
        console.log(`Success: Got ${recommendations.length} items on attempt ${attempt}`);
        break;
      }

      // If we got less than 3 on first attempt, wait and retry
      if (attempt === 1 && recommendations.length < 3) {
        console.log(`Only got ${recommendations.length} items, retrying...`);
        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Ensure we have recommendations even if retry failed
    if (recommendations.length === 0) {
      console.warn("No recommendations parsed, returning empty array");
      return [];
    }

    // Merge with cache and update
    if (userId && recommendations.length > 0) {
      console.log("Merging", recommendations.length, "new recommendations with cache");
      await mergeAndCacheRecommendations("destination", cacheKey, userId, recommendations, cacheResult?.cacheDoc);
    }

    // Return merged result (new + cached)
    const mergedRecommendations = [...recommendations];
    if (cacheResult?.cacheDoc?.recommendations) {
      const newNames = new Set(recommendations.map((r) => `${r.name}, ${r.country}`));
      const existingUnique = (cacheResult.cacheDoc.recommendations as any[]).filter(
        (r: any) => !newNames.has(`${r.name}, ${r.country}`)
      );
      mergedRecommendations.push(...existingUnique);
      console.log(`Merged: ${recommendations.length} new + ${existingUnique.length} cached = ${mergedRecommendations.length} total`);
    } else {
      console.log(`No cached recommendations. Returning ${mergedRecommendations.length} new items.`);
    }

    return mergedRecommendations;
  } catch (error) {
    console.error("Error recommending destinations:", error);
    return [];
  }
}

/**
 * Extract user interests from their activity votes and preferences
 * This analyzes the activities they've voted for to infer their interests
 */
export async function extractUserInterests(userId: string): Promise<string[]> {
  try {
    // Get activities the user voted for
    const { resources } = await containers.activities.items
      .query({
        query:
          "SELECT * FROM c WHERE ARRAY_CONTAINS(c.votedBy, @userId)",
        parameters: [{ name: "@userId", value: userId }],
      })
      .fetchAll();

    const votedActivities = resources as Activity[];

    if (votedActivities.length === 0) {
      return ["adventure", "culture", "food", "relaxation"]; // Default interests
    }

    // Extract categories from voted activities
    const categories = votedActivities.map((a) => a.category);
    const categoryCount: Record<string, number> = {};

    categories.forEach((cat) => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Return top 3-4 categories by frequency
    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([cat]) => cat);

    return topCategories.length > 0
      ? topCategories
      : ["adventure", "culture", "food", "relaxation"];
  } catch (error) {
    console.error("Error extracting user interests:", error);
    return ["adventure", "culture", "food", "relaxation"]; // Fallback
  }
}
