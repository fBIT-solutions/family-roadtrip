import z from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  image: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const DestinationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  addedBy: z.string(), // User ID
  votes: z.number().default(0),
  votedBy: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.enum(["hotel", "restaurant", "activity", "transport", "other"]),
  startDate: z.date(),
  endDate: z.date().optional(),
  location: z.string(),
  details: z.string().optional(),
  confirmationNumber: z.string().optional(),
  cost: z.number().optional(),
  currency: z.string().default("USD"),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TimelineEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  date: z.date(),
  type: z.enum(["milestone", "event", "deadline"]),
  category: z.string().optional(),
  completed: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FileMetadataSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  blobUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  category: z.enum(["document", "ticket", "picture", "other"]),
  relatedId: z.string().optional(), // Can link to reservation, destination, etc
  uploadedBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
