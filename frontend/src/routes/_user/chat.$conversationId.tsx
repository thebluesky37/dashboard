import { Conversation } from "@/components/Conversation/Conversation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_user/chat/$conversationId")({
  component: UserChatPage,
});

function UserChatPage() {
  return <Conversation />;
}
