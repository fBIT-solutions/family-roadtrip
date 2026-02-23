import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">🚗 Family Road Trip 2028</h1>
            </div>
            <div className="flex items-center gap-4">
              {session ? (
                <>
                  <span className="text-gray-700">Welcome, {session.user?.name}</span>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {session ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Destinations Card */}
            <Link href="/destinations">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <div className="text-4xl mb-2">🌍</div>
                <h2 className="text-xl font-bold text-gray-800">Destinations</h2>
                <p className="text-gray-600">Suggest and vote on destinations</p>
              </div>
            </Link>

            {/* Reservations Card */}
            <Link href="/reservations">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <div className="text-4xl mb-2">🏨</div>
                <h2 className="text-xl font-bold text-gray-800">Reservations</h2>
                <p className="text-gray-600">Hotels, restaurants, activities</p>
              </div>
            </Link>

            {/* Timeline Card */}
            <Link href="/timeline">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <div className="text-4xl mb-2">📅</div>
                <h2 className="text-xl font-bold text-gray-800">Timeline</h2>
                <p className="text-gray-600">Plan milestones and events</p>
              </div>
            </Link>

            {/* Files Card */}
            <Link href="/files">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <div className="text-4xl mb-2">📁</div>
                <h2 className="text-xl font-bold text-gray-800">Files</h2>
                <p className="text-gray-600">Tickets, documents, photos</p>
              </div>
            </Link>
          </div>

          {/* Upcoming Events Summary */}
          <div className="mt-12 bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Trip Overview</h2>
            <p className="text-gray-600">
              Get started by adding destinations you'd like to visit, creating reservations for
              accommodations and activities, planning timeline milestones, and uploading important
              documents and photos for your trip!
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Plan Your 2028 Family Road Trip
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Sign in to start planning your adventure together!
          </p>
          <button
            onClick={() => signIn()}
            className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
          >
            Sign In to Get Started
          </button>
        </div>
      )}
    </div>
  );
}
