import z from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  image: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
  preferences: z.object({
    interests: z.array(z.string()).default([]), // Tags: adventure, culture, food, relaxation, etc
    dislikes: z.array(z.string()).default([]), // Things to avoid: crowds, expensive, etc
  }).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const TripSchema = z.object({
  id: z.string().uuid(),
  name: z.string(), // e.g., "Summer 2025 Europe Trip"
  goal: z.enum(["relaxation", "adventure", "work", "cultural", "food", "family", "other"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  days: z.number().int().positive(), // Calculated from startDate and endDate
  people: z.array(z.string()).default([]), // Array of user emails - Full travelers
  viewers: z.array(z.string()).default([]), // Array of user emails - Guest viewers (limited access)
  hasPet: z.boolean().default(false),
  status: z.enum(["planning", "active", "completed", "cancelled"]).default("planning"),
  totalBudget: z.number(),
  currency: z.string().default("EUR"),
  createdBy: z.string(), // User email or ID
  description: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const DestinationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  place: z.string(),
  country: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tripId: z.string().uuid().optional(), // Link to trip (can be unassigned)
  status: z.enum(["proposed", "accepted", "planned", "visited"]).default("proposed"),
  addedBy: z.string(), // User ID
  votes: z.number().default(0),
  votedBy: z.array(z.string()).default([]),
  urls: z.array(z.string().url()).default([]),
  photos: z.array(z.object({
    url: z.string().url(),
    description: z.string().optional(),
  })).default([]),
  mainPhotoUrl: z.union([z.literal(""), z.string().url()]).optional(),
  estimatedBudget: z.number().optional(), // Estimated cost from AI recommendation
  currency: z.string().default("EUR"), // Currency for estimated budget
  public: z.boolean().default(false), // Whether destination is visible to other users
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.enum(["hotel", "restaurant", "activity", "transport", "other"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  location: z.string(),
  details: z.string().optional(),
  confirmationNumber: z.string().optional(),
  cost: z.number().optional(),
  currency: z.string().default("EUR"),
  tripId: z.string().uuid().optional(), // Link to trip
  createdBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  startDateTime: z.coerce.date().optional(), // For range/flight events
  endDateTime: z.coerce.date().optional(), // For range/flight events
  type: z.enum(["milestone", "event", "deadline"]),
  category: z.string().optional(), // Predefined categories: flight, reservation, activity, etc
  activityId: z.string().uuid().optional(), // Link to existing activity (for Activity category)
  flightDetails: z.object({
    departureFlightNumber: z.string(),
    departureDateTime: z.coerce.date(),
    returnFlightNumber: z.string().optional(),
    returnDateTime: z.coerce.date().optional(),
  }).optional(), // For flight events
  tripId: z.string().uuid().optional(), // Link to trip
  completed: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const FileMetadataSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  blobUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  category: z.enum(["document", "ticket", "picture", "video", "reservation", "other"]),
  tripId: z.string().uuid().optional(), // Link to trip
  destinationId: z.string().uuid().optional(), // Link to destination
  activityId: z.string().uuid().optional(), // Link to activity
  uploadedBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  amount: z.number(),
  currency: z.string().default("EUR"),
  category: z.enum(["accommodation", "food", "transport", "activity", "shopping", "other"]).default("other"),
  date: z.coerce.date(),
  tripId: z.string().uuid().optional(), // Link to trip
  destinationId: z.string().optional(), // Link to destination within trip
  paidBy: z.string(), // User ID
  splitWith: z.array(z.string()).default([]), // Array of user IDs to split with
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const BudgetLineSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(["accommodation", "food", "transport", "activity", "shopping", "other"]).default("other"),
  budgetAmount: z.number(),
  actualAmount: z.number().default(0),
  notes: z.string().optional(),
});

export const DestinationBudgetSchema = z.object({
  id: z.string().uuid(),
  destinationId: z.string(),
  totalBudget: z.number(),
  lines: z.array(BudgetLineSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const TripBudgetSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  totalBudget: z.number(),
  currency: z.string().default("EUR"),
  destinationBudgets: z.array(DestinationBudgetSchema).default([]),
  notes: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  location: z.string().optional(), // City, address, or venue name
  latitude: z.number().optional(), // Coordinates for the activity location
  longitude: z.number().optional(),
  mainPhotoUrl: z.union([z.literal(""), z.string().url()]).optional(), // Main photo for the activity
  destinationId: z.string().uuid().optional(), // Link to destination (optional - can be assigned later)
  tripId: z.string().uuid().optional(), // Link to trip
  category: z.enum(["outdoor", "cultural", "food", "nightlife", "shopping", "sports", "relaxation", "adventure", "other"]).default("other"),
  url: z.string().url().optional(), // Google Maps, TripAdvisor, etc
  estimatedCost: z.number().optional(),
  currency: z.string().default("USD"),
  duration: z.string().optional(), // e.g., "2 hours", "half-day", "full-day"
  addedBy: z.string(), // User ID
  votes: z.number().default(0),
  votedBy: z.array(z.string()).default([]),
  status: z.enum(["suggested", "planned", "completed", "cancelled"]).default("suggested"),
  eventIds: z.array(z.string().uuid()).default([]), // Links to timeline events
  public: z.boolean().default(false), // Whether activity is visible to other users
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ActivityRecommendationSchema = z.object({
  id: z.string().uuid(),
  destinationId: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(["outdoor", "cultural", "food", "nightlife", "shopping", "sports", "relaxation", "adventure", "other"]),
  estimatedCost: z.number().optional(),
  currency: z.string().default("EUR"),
  duration: z.string().optional(),
  sourceUrl: z.string().url().optional(), // Link to activity booking/info (e.g., Google Maps, TripAdvisor)
  confidence: z.number().min(0).max(1), // 0-1 score for how well it matches interests
  reason: z.string(), // Why this was recommended
  createdAt: z.coerce.date(),
});

export const DestinationRecommendationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  country: z.string(),
  description: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sourceUrl: z.string().url().optional(), // Link to destination info (e.g., Wikipedia, tourism board)
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  estimatedBudget: z.number().optional(),
  currency: z.string().default("EUR"),
  createdAt: z.coerce.date(),
});

export const RecommendationCacheSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["activity", "destination"]),
  userId: z.string(), // User who requested
  cacheKey: z.string(), // Hash of request parameters for quick lookup
  recommendations: z.array(
    z.union([
      ActivityRecommendationSchema,
      DestinationRecommendationSchema,
    ])
  ),
  expiresAt: z.coerce.date(), // 30 days from creation
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(), // Track last update for merged recommendations
});

export const RecommendationDislikeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: z.enum(["activity", "destination"]),
  recommendationId: z.string(),
  name: z.string(), // Name of disliked recommendation
  category: z.string().optional(), // Category (food, outdoor, expensive, etc)
  reason: z.string().optional(), // Why they disliked it
  tags: z.array(z.string()).default([]), // Tags to avoid (e.g., "crowded", "expensive", "touristy")
  createdAt: z.coerce.date(),
});

export const UserPreferencesSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  interests: z.array(z.string()).default([]), // Preferred activities: adventure, culture, food, relaxation, shopping, etc
  dislikes: z.array(z.string()).default([]), // Things to avoid: crowds, expensive restaurants, touristy places, etc
  cuisinePreferences: z.array(z.string()).default([]), // Preferred cuisines
  accomodationDistance: z.number().optional(), // Preferred walkability (km)
  travelPace: z.enum(["slow", "moderate", "fast"]).optional(), // How fast they want to travel between destinations
  budgetSensitivity: z.enum(["budget", "moderate", "luxury"]).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ItemReference: Created when a user adds someone else's public destination or activity
// Stores a copy of the general (non-trip-specific) data from the original item
export const ItemReferenceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["destination", "activity"]), // Type of referenced item
  originalItemId: z.string().uuid(), // ID of the original item
  originalCreatorId: z.string(), // User ID of original creator
  userId: z.string(), // User who added this reference
  tripId: z.string().uuid().optional(), // Trip this reference is associated with (optional)
  // General data (copy from original item)
  name: z.string(),
  description: z.string().optional(),
  place: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mainPhotoUrl: z.union([z.literal(""), z.string().url()]).optional(),
  // User-specific data for this reference
  destinationId: z.string().uuid().optional(), // For activities: which destination they're linked to in this trip
  status: z.string().optional(), // User's status (proposed, accepted, planned, visited, suggested, planned, completed, cancelled)
  notes: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ItemPermission: Fine-grained access control for items
// Tracks who has what access (owner, contributor, reader) to which items
export const ItemPermissionSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(), // ID of the item (trip, destination, activity, file, expense, schedule)
  itemType: z.enum(["trip", "destination", "activity", "file", "expense", "schedule"]),
  userId: z.string(), // Email of user, or "*" for public items
  role: z.enum(["owner", "contributor", "reader"]),
  parentType: z.enum(["trip", "destination"]).optional(), // Parent item type (for nested items)
  parentId: z.string().uuid().optional(), // Parent item ID (for nested items)
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Tracks requests from guests to become travelers
export const TravelerRequestSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  requesterEmail: z.string().email(),
  requesterName: z.string().optional(),
  ownerId: z.string(), // Trip owner email
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;
export type Trip = z.infer<typeof TripSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;
export type BudgetLine = z.infer<typeof BudgetLineSchema>;
export type DestinationBudget = z.infer<typeof DestinationBudgetSchema>;
export type TripBudget = z.infer<typeof TripBudgetSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityRecommendation = z.infer<typeof ActivityRecommendationSchema>;
export type DestinationRecommendation = z.infer<typeof DestinationRecommendationSchema>;
export type RecommendationCache = z.infer<typeof RecommendationCacheSchema>;
export type RecommendationDislike = z.infer<typeof RecommendationDislikeSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type ItemReference = z.infer<typeof ItemReferenceSchema>;
export type ItemPermission = z.infer<typeof ItemPermissionSchema>;
export type TravelerRequest = z.infer<typeof TravelerRequestSchema>;
