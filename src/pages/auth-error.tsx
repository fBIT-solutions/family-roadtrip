import React from "react";
import Link from "next/link";

export default function AuthError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl mb-2">⚠️</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Error</h2>
        <p className="text-gray-600 mb-6">
          There was a problem signing you in. Please try again.
        </p>
        <Link href="/login">
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Login
          </button>
        </Link>
      </div>
    </div>
  );
}
