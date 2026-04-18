import { ConnectionSelector } from "@/components/Connection/ConnectionSelector";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/connections")({
  component: AdminConnectionsPage,
});

function AdminConnectionsPage() {
  return (
    <div className="p-6">
      <ConnectionSelector />
    </div>
  );
}
