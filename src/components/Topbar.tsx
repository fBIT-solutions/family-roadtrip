import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export function Topbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 cursor-pointer">🚗 Trip Planner</h1>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {session ? (
              <>
                <span className="text-xs sm:text-sm text-gray-700 hidden sm:block">Welcome, {session.user?.name}</span>
                <Link href="/my-space">
                  <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
                    🏠 My Space
                  </button>
                </Link>
                <Link href="/requests">
                  <button className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                    📋 Requests
                  </button>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-2 sm:px-4 py-2 text-xs sm:text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
