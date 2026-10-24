import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import * as tripsApi from "@/api/trips";
import handler from "@/pages/api/trips/[id]";
import { Trip } from "@/types/schema";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/pages/api/auth/authConfig", () => ({
  authOptions: {},
}));

jest.mock("@/api/trips", () => ({
  getTrip: jest.fn(),
  getTripWithStats: jest.fn(),
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
}));

jest.mock("@/lib/notifications", () => ({
  notifyUserAddedToTrip: jest.fn(),
  notifyUserRemovedFromTrip: jest.fn(),
}));

const tripId = "50e84000-e29b-41d4-a716-446655440000";
const creatorEmail = "creator@example.com";
const travelerEmail = "traveler@example.com";
const viewerEmail = "viewer@example.com";

const trip: Trip = {
  id: tripId,
  name: "Summer Roadtrip",
  goal: "adventure",
  startDate: new Date("2028-06-01"),
  endDate: new Date("2028-06-15"),
  days: 15,
  people: [travelerEmail],
  viewers: [viewerEmail],
  hasPet: false,
  status: "planning",
  totalBudget: 5000,
  currency: "USD",
  createdBy: creatorEmail,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const getSessionMock = getServerSession as jest.Mock;
const getTripMock = tripsApi.getTrip as jest.Mock;
const getTripWithStatsMock = tripsApi.getTripWithStats as jest.Mock;
const updateTripMock = tripsApi.updateTrip as jest.Mock;
const deleteTripMock = tripsApi.deleteTrip as jest.Mock;

function createRequest(
  method: string,
  query: Record<string, string | string[]> = {},
  body: Record<string, unknown> = {}
): NextApiRequest {
  return { method, query, body } as unknown as NextApiRequest;
}

function createResponse() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return response as unknown as NextApiResponse & typeof response;
}

describe("Trip API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionMock.mockResolvedValue({
      user: { email: creatorEmail },
      expires: "2028-01-01",
    });
  });

  it("rejects requests without a session", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(getTripWithStatsMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the trip ID is missing", async () => {
    const response = createResponse();

    await handler(createRequest("GET"), response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip ID is required" });
  });

  it("returns 404 when the requested trip does not exist", async () => {
    getTripWithStatsMock.mockResolvedValue(null);
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });

  it("allows a viewer to read a trip", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: viewerEmail },
      expires: "2028-01-01",
    });
    const tripData = { trip, stats: {} };
    getTripWithStatsMock.mockResolvedValue(tripData);
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(getTripWithStatsMock).toHaveBeenCalledWith(tripId, viewerEmail);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(tripData);
  });

  it("denies trip reads to users who are not members", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: "stranger@example.com" },
      expires: "2028-01-01",
    });
    getTripWithStatsMock.mockResolvedValue({ trip, stats: {} });
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have access to this trip",
    });
  });

  it("prevents viewers from updating a trip", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: viewerEmail },
      expires: "2028-01-01",
    });
    getTripMock.mockResolvedValue(trip);
    const response = createResponse();

    await handler(
      createRequest("PUT", { id: tripId }, { name: "Changed name" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have permission to edit this trip",
    });
    expect(updateTripMock).not.toHaveBeenCalled();
  });

  it("updates a trip for a traveler with valid input", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: travelerEmail },
      expires: "2028-01-01",
    });
    getTripMock.mockResolvedValue(trip);
    const updatedTrip = { ...trip, name: "Updated roadtrip" };
    updateTripMock.mockResolvedValue(updatedTrip);
    const response = createResponse();

    await handler(
      createRequest("PUT", { id: tripId }, { name: updatedTrip.name }),
      response
    );

    expect(updateTripMock).toHaveBeenCalledWith(tripId, { name: updatedTrip.name });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(updatedTrip);
  });

  it("allows only the creator to delete a trip", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: travelerEmail },
      expires: "2028-01-01",
    });
    getTripMock.mockResolvedValue(trip);
    const response = createResponse();

    await handler(createRequest("DELETE", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "Only the trip creator can delete this trip",
    });
    expect(deleteTripMock).not.toHaveBeenCalled();
  });

  it("deletes a trip for its creator", async () => {
    getTripMock.mockResolvedValue(trip);
    deleteTripMock.mockResolvedValue(true);
    const response = createResponse();

    await handler(createRequest("DELETE", { id: tripId }), response);

    expect(deleteTripMock).toHaveBeenCalledWith(tripId);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true });
  });

  it("returns 405 for unsupported HTTP methods", async () => {
    const response = createResponse();

    await handler(createRequest("PATCH", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });
});
