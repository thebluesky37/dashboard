import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_user/chat")({
  component: () => (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      Select a conversation or start a new chat.
    </div>
  ),
});
