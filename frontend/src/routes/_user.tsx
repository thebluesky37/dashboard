import UserSidebar from "@/components/User/UserSidebar";
import {
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { createFileRoute, Outlet, useSearch } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_user")({
  component: UserLayout,
});

function UserLayout() {
  const search = useSearch({ strict: false }) as { embed?: string };
  const isEmbed = search.embed === "1";
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {!isEmbed && (
        <>
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="fixed top-3 left-3 z-50 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm hover:bg-gray-100"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <Bars3Icon className="h-5 w-5" />
            )}
          </button>

          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-gray-900/5"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div
            className={[
              "fixed left-0 top-0 z-40 h-screen w-60 transform transition-transform duration-200 ease-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            <UserSidebar />
          </div>
        </>
      )}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
