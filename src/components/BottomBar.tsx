import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";

type BottomBarLink = {
  label: string;
  href: string;
  icon: string;
  count?: number | null;
};

function getPageLinks(pathname: string, tripId?: string, counts?: { destinations: number | null; activities: number | null }): BottomBarLink[] {
  if (pathname === "/my-space") {
    return [
      { label: "Destinations", href: "/my-space?tab=destinations", icon: "📍", count: counts?.destinations },
      { label: "Activities", href: "/my-space?tab=activities", icon: "🎯", count: counts?.activities },
      { label: "Preferences", href: "/my-space?tab=preferences", icon: "⚙️" },
    ];
  }

  if (pathname.startsWith("/trips/[id]") && tripId) {
    return [
      { label: "Trip", href: `/trips/${tripId}`, icon: "🧭" },
      { label: "Destinations", href: `/trips/${tripId}/destinations`, icon: "📍" },
      { label: "Schedule", href: `/trips/${tripId}/schedule`, icon: "📅" },
      { label: "Budget", href: `/budgets?tripId=${tripId}`, icon: "💰" },
    ];
  }

  if (pathname === "/discover") {
    return [
      { label: "Destinations", href: "/discover#destinations", icon: "📍" },
      { label: "Activities", href: "/discover#activities", icon: "🎯" },
    ];
  }

  if (pathname === "/destinations") {
    return [
      { label: "Discover", href: "/discover#destinations", icon: "🔎" },
      { label: "Activities", href: "/activities", icon: "🎯" },
    ];
  }

  if (pathname === "/activities") {
    return [
      { label: "Discover", href: "/discover#activities", icon: "🔎" },
      { label: "Destinations", href: "/destinations", icon: "📍" },
    ];
  }

  if (pathname === "/budgets") {
    return [{ label: "Expenses", href: "/expenses", icon: "💸" }];
  }

  return [];
}

export function BottomBar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mySpaceCounts, setMySpaceCounts] = useState<{ destinations: number | null; activities: number | null }>({
    destinations: null,
    activities: null,
  });
  const isHomePage = router.pathname === "/";
  const isMySpacePage = router.pathname === "/my-space";
  const pageLinks = getPageLinks(
    router.pathname,
    typeof router.query.id === "string" ? router.query.id : undefined,
    mySpaceCounts
  );

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    router.events.on("routeChangeStart", closeMenu);
    return () => router.events.off("routeChangeStart", closeMenu);
  }, [router.events]);

  useEffect(() => {
    if (status !== "authenticated" || !isMySpacePage) return;

    const fetchMySpaceCounts = async () => {
      try {
        const [destinationResponse, activityResponse] = await Promise.all([
          axios.get("/api/destinations"),
          axios.get("/api/activities"),
        ]);
        const destinations = destinationResponse.data.destinations || destinationResponse.data;
        const activities = activityResponse.data.activities || [];
        const userEmail = session?.user?.email || "";

        setMySpaceCounts({
          destinations: destinations.filter((item: { addedBy?: string }) => item.addedBy === userEmail).length,
          activities: activities.filter((item: { addedBy?: string }) => item.addedBy === userEmail).length,
        });
      } catch (error) {
        console.error("Error fetching My Space navigation counts:", error);
        setMySpaceCounts({ destinations: null, activities: null });
      }
    };

    void fetchMySpaceCounts();
  }, [isMySpacePage, session?.user?.email, status]);

  if (status !== "authenticated") return null;

  return (
    <nav
      aria-label="Main navigation"
      className="app-bottom-bar fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {isHomePage ? (
          <div className="grid grid-cols-3 items-center gap-2 py-2">
            <Link
              href="/my-space"
              className="flex min-h-11 flex-col items-center justify-center rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              <span aria-hidden="true">🏠</span>
              <span>My Space</span>
            </Link>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex min-h-11 w-full flex-col items-center justify-center rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              <span aria-hidden="true">＋</span>
              <span>Create</span>
            </button>
            <Link
              href="/discover"
              className="flex min-h-11 flex-col items-center justify-center rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              <span aria-hidden="true">🔎</span>
              <span>Discover</span>
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-around gap-1 py-2">
            {pageLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={router.asPath === item.href ? "page" : undefined}
                className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold leading-tight text-gray-700 hover:bg-gray-100 sm:text-xs"
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="flex items-center gap-1 text-center">
                  {item.label}
                  {item.count !== undefined && item.count !== null && (
                    <span className="rounded-full bg-blue-100 px-1.5 text-[10px] leading-4 text-blue-700">
                      {item.count}
                    </span>
                  )}
                </span>
              </Link>
            ))}
            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold leading-tight text-gray-700 hover:bg-gray-100 sm:text-xs"
              >
                <span aria-hidden="true">☰</span>
                <span>Menu</span>
              </button>
            </div>
          </div>
        )}

        {menuOpen && (
          <div
            role="menu"
            aria-label={isHomePage ? "Create new" : "Main options"}
            className="absolute bottom-full right-3 mb-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl sm:right-6 lg:right-8"
          >
            {!isHomePage && (
              <>
                <Link
                  role="menuitem"
                  href="/my-space"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm text-gray-800 hover:bg-blue-50"
                >
                  🏠 My Space
                </Link>
                <Link
                  role="menuitem"
                  href="/discover"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm text-gray-800 hover:bg-blue-50"
                >
                  🔎 Discover
                </Link>
                <div className="my-1 border-t border-gray-100" />
              </>
            )}
            <Link
              role="menuitem"
              href="/?create=trip"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-gray-800 hover:bg-blue-50"
            >
              ✈️ Create trip
            </Link>
            <Link
              role="menuitem"
              href="/?create=destination"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-gray-800 hover:bg-blue-50"
            >
              📍 Create destination
            </Link>
            <Link
              role="menuitem"
              href="/activities#add-activity"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm text-gray-800 hover:bg-blue-50"
            >
              🎯 Create activity
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
