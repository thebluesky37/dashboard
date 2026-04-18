import DefaultConnectionPicker from "@/components/Admin/DefaultConnectionPicker";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="p-6 flex flex-col gap-8 max-w-2xl">
      <h1 className="text-xl font-semibold">Admin Settings</h1>
      <DefaultConnectionPicker />
    </div>
  );
}
