import { checkAdminAuth } from "@/api";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    const isAdmin = await checkAdminAuth();
    if (!isAdmin) {
      throw redirect({ to: "/admin-login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
