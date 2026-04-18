import { api } from "@/api";
import { CONVERSATIONS_QUERY_KEY } from "@/hooks/conversations";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

export default function UserSidebar() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: async () => (await api.listConversations()).data,
  });

  const { data: defaultConnection } = useQuery({
    queryKey: ["DEFAULT_CONNECTION"],
    queryFn: () => api.getDefaultConnection(),
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!defaultConnection?.id) {
        throw new Error("No default connection set");
      }
      return api.createConversation(defaultConnection.id, "Untitled chat");
    },
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.data.id },
      });
    },
  });

  return (
    <nav className="w-60 flex-shrink-0 flex flex-col p-4 bg-gray-900 border-r border-gray-800 h-full">
      <button
        onClick={() => createConversation.mutate()}
        disabled={!defaultConnection?.id || createConversation.isPending}
        className="mb-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded text-sm font-medium"
        title={!defaultConnection?.id ? "Admin has not set a default connection" : ""}
      >
        + New Chat
      </button>

      {!defaultConnection?.id && (
        <p className="text-xs text-yellow-500 mb-2">
          No default connection configured.
        </p>
      )}

      <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
        {(conversations ?? []).map((conversation) => (
          <Link
            key={conversation.id}
            to="/chat/$conversationId"
            params={{ conversationId: conversation.id }}
            className="truncate px-2 py-1.5 rounded hover:bg-gray-800 text-sm text-gray-300"
          >
            {conversation.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
