import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import PreferencesPanel from "@/components/PreferencesPanel";

export default function PreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your travel preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white rounded-lg shadow-md overflow-hidden">
              <ul className="divide-y divide-gray-200">
                <li>
                  <a
                    href="#preferences"
                    className="block px-4 py-4 text-gray-700 hover:bg-blue-50 font-medium transition"
                  >
                    🎯 Travel Preferences
                  </a>
                </li>
                <li>
                  <a
                    href="/preferences/dislikes"
                    className="block px-4 py-4 text-gray-700 hover:bg-blue-50 transition"
                  >
                    👎 Disliked Items
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="block px-4 py-4 text-gray-700 hover:bg-blue-50 transition text-sm"
                  >
                    ← Back to Destinations
                  </a>
                </li>
              </ul>
            </nav>

            {/* User Info */}
            <div className="mt-6 bg-white rounded-lg shadow-md p-4">
              <div className="text-center">
                {session?.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-16 h-16 rounded-full mx-auto mb-3"
                  />
                )}
                <p className="font-semibold text-gray-900">
                  {session?.user?.name}
                </p>
                <p className="text-sm text-gray-600">{session?.user?.email}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div id="preferences">
              <PreferencesPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
