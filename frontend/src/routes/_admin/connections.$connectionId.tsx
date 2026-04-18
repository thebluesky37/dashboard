import { ConnectionEditor } from "@/components/Connection/ConnectionEditor";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/connections/$connectionId")({
  component: AdminConnectionEditorPage,
});

function AdminConnectionEditorPage() {
  return <ConnectionEditor />;
}
