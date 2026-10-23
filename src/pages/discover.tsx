import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Activity, Destination } from "@/types/schema";
import { Topbar } from "@/components/Topbar";

export default function DiscoverPage() {
  const router = useRouter();
  const { status } = useSession();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      void router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;

    const fetchPublicContent = async () => {
      setLoading(true);
      setError("");
      try {
        const [destinationResponse, activityResponse] = await Promise.all([
          axios.get("/api/destinations/public"),
          axios.get("/api/activities"),
        ]);
        setDestinations(destinationResponse.data.destinations || []);
        setActivities(
          (activityResponse.data.activities || []).filter((activity: Activity) => activity.public)
        );
      } catch (fetchError) {
        console.error("Error fetching public content:", fetchError);
        setError("Unable to load public destinations and activities. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    void fetchPublicContent();
  }, [router, status]);

  if (status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-800 sm:text-3xl">Discover</h1>
        <p className="mb-8 text-gray-600">Explore destinations and activities shared by the community.</p>

        {error && (
          <div role="alert" className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-gray-600">Loading public content...</p>
        ) : (
          <div className="space-y-12">
            <section id="destinations" aria-labelledby="discover-destinations-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="discover-destinations-heading" className="text-xl font-bold text-gray-800 sm:text-2xl">
                  Public destinations
                </h2>
                <span className="text-sm text-gray-500">{destinations.length} shared</span>
              </div>
              {destinations.length === 0 ? (
                <p className="rounded-lg bg-white p-6 text-gray-600">No public destinations have been shared yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {destinations.map((destination) => (
                    <article key={destination.id} className="overflow-hidden rounded-lg bg-white shadow">
                      {destination.mainPhotoUrl && (
                        <img
                          src={destination.mainPhotoUrl}
                          alt={destination.name}
                          className="h-40 w-full object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900">{destination.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {destination.place}, {destination.country}
                        </p>
                        {destination.description && (
                          <p className="mt-2 line-clamp-3 text-sm text-gray-700">{destination.description}</p>
                        )}
                        <Link
                          href={`/destinations/${destination.id}`}
                          className="mt-4 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          View destination
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="activities" aria-labelledby="discover-activities-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="discover-activities-heading" className="text-xl font-bold text-gray-800 sm:text-2xl">
                  Public activities
                </h2>
                <span className="text-sm text-gray-500">{activities.length} shared</span>
              </div>
              {activities.length === 0 ? (
                <p className="rounded-lg bg-white p-6 text-gray-600">No public activities have been shared yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activities.map((activity) => (
                    <article key={activity.id} className="overflow-hidden rounded-lg bg-white shadow">
                      {activity.mainPhotoUrl && (
                        <img
                          src={activity.mainPhotoUrl}
                          alt={activity.name}
                          className="h-40 w-full object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900">{activity.name}</h3>
                        <p className="mt-1 text-sm capitalize text-gray-600">{activity.category}</p>
                        {activity.description && (
                          <p className="mt-2 line-clamp-3 text-sm text-gray-700">{activity.description}</p>
                        )}
                        <Link
                          href={`/activities/${activity.id}`}
                          className="mt-4 inline-block rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          View activity
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
