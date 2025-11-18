"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden z-50">
        <div className="grid grid-cols-3 h-16">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center text-xs transition ${
              isActive("/")
                ? "text-black font-semibold"
                : "text-gray-500"
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Markets
          </Link>
          <Link
            href="/create"
            className={`flex flex-col items-center justify-center text-xs transition ${
              isActive("/create")
                ? "text-black font-semibold"
                : "text-gray-500"
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create
          </Link>
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center text-xs transition ${
              isActive("/dashboard")
                ? "text-black font-semibold"
                : "text-gray-500"
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Leaderboard
          </Link>
        </div>
      </nav>

      {/* Desktop Tabs */}
      <div className="hidden sm:block bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            <Link
              href="/"
              className={`px-6 py-4 text-sm font-medium transition border-b-2 ${
                isActive("/")
                  ? "text-black border-black"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Markets
            </Link>
            <Link
              href="/create"
              className={`px-6 py-4 text-sm font-medium transition border-b-2 ${
                isActive("/create")
                  ? "text-black border-black"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Create Market
            </Link>
            <Link
              href="/dashboard"
              className={`px-6 py-4 text-sm font-medium transition border-b-2 ${
                isActive("/dashboard")
                  ? "text-black border-black"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

