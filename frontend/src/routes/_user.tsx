import UserSidebar from "@/components/User/UserSidebar";
import { createFileRoute, Outlet, useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/_user")({
  component: UserLayout,
});

function UserLayout() {
  const search = useSearch({ strict: false }) as { embed?: string };
  const isEmbed = search.embed === "1";

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {!isEmbed && <UserSidebar />}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
