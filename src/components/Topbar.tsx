import React from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export function Topbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap justify-between items-center gap-x-3 gap-y-2 py-2">
          <div className="flex items-center">
            <Link href="/">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 cursor-pointer">🚗 Trip Planner</h1>
            </Link>
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-4">
            {!session && (
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
