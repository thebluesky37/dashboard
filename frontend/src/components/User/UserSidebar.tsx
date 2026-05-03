import { api } from "@/api";
import { CONVERSATIONS_QUERY_KEY } from "@/hooks/conversations";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useDeleteConversation } from "@/hooks/conversations";
import { TrashIcon } from "@heroicons/react/24/outline";
import { CustomTooltip } from "@/components/Library/Tooltip";

export default function UserSidebar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false }) as { embed?: string; embed_token?: string };
  // Read from location directly as a fallback in case route-level search typing strips unknown keys.
  const locationSearch = new URLSearchParams(window.location.search);
  const embedToken = search.embed_token ?? locationSearch.get("embed_token") ?? undefined;

  const { data: conversations } = useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, embedToken ?? ""],
    queryFn: async () => (await api.listConversations(embedToken)).data,
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
      return api.createConversation(defaultConnection.id, "Untitled chat", embedToken);
    },
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conv.data.id },
        search: (prev) => prev,
      });
    },
  });

  const { mutate: deleteConversation, isPending: isDeletingConversation } =
    useDeleteConversation({
      onSuccess: (_data: unknown, deletedConversationId: string) => {
        const activeConversationId =
          typeof params.conversationId === "string"
            ? params.conversationId
            : undefined;
        const remainingConversations = (conversations ?? []).filter(
          (conversation) => conversation.id !== deletedConversationId
        );

        if (activeConversationId === deletedConversationId) {
          const newestRemainingConversation = remainingConversations[0];
          if (newestRemainingConversation) {
            navigate({
              to: "/chat/$conversationId",
              params: { conversationId: newestRemainingConversation.id },
              search: (prev) => prev,
            });
            return;
          }
          navigate({ to: "/chat", search: (prev) => prev });
        }
      },
    });

  return (
    <nav className="w-60 flex-shrink-0 flex flex-col p-3 bg-white border-r border-gray-200 h-full shadow-sm">
      <button
        onClick={() => createConversation.mutate()}
        disabled={!defaultConnection?.id || createConversation.isPending}
        className="mb-3 w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
      >
        + New Chat
      </button>

      {!defaultConnection?.id && (
        <p className="text-xs text-amber-600 mb-2">
          No default connection configured.
        </p>
      )}

      <div className="flex flex-col gap-0.5 overflow-y-auto flex-1">
        {(conversations ?? []).map((conversation) => (
          <Link
            key={conversation.id}
            to="/chat/$conversationId"
            params={{ conversationId: conversation.id }}
            search={(prev) => prev}
            className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 text-sm text-gray-700 [&.active]:bg-gray-100 [&.active]:font-medium"
          >
            <span className="flex-1 truncate">{conversation.name}</span>
            <CustomTooltip hoverText="Delete" unstyledTrigger>
              <button
                type="button"
                aria-label="Delete conversation"
                disabled={isDeletingConversation}
                className="opacity-0 transition-opacity text-gray-400 hover:text-gray-700 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  deleteConversation(conversation.id);
                }}
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </CustomTooltip>
          </Link>
        ))}
      </div>
    </nav>
  );
}
