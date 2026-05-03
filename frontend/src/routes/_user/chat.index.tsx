import { api } from "@/api";
import { useGetConversations } from "@/hooks/conversations";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/_user/chat/")({
  component: ChatIndexPage,
});

function ChatIndexPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = useSearch({ strict: false }) as { embed_token?: string };
  const locationSearch = new URLSearchParams(window.location.search);
  const embedToken = search.embed_token ?? locationSearch.get("embed_token") ?? undefined;
  const attemptedAutoCreate = useRef(false);

  const { data: conversations, isLoading: isLoadingConversations } = useGetConversations();
  const { data: defaultConnection } = useQuery({
    queryKey: ["DEFAULT_CONNECTION"],
    queryFn: () => api.getDefaultConnection(),
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!defaultConnection?.id) {
        throw new Error("No default connection set");
      }
      return api.createConversation(defaultConnection.id, "Untitled chat", embedToken);
    },
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["CONVERSATIONS"] });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.data.id },
        search: (prev) => prev,
      });
    },
  });

  useEffect(() => {
    if (attemptedAutoCreate.current) return;
    if (isLoadingConversations) return;
    if (!defaultConnection?.id) return;
    if (!conversations || conversations.length > 0) return;

    attemptedAutoCreate.current = true;
    createConversation.mutate();
  }, [conversations, defaultConnection?.id, isLoadingConversations, createConversation]);

  if (isLoadingConversations || createConversation.isPending) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Creating a new chat...
      </div>
    );
  }

  if (!defaultConnection?.id) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No default connection configured.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      Select a conversation or start a new chat.
    </div>
  );
}
