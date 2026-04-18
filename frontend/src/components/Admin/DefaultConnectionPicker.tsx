import { api } from "@/api";
import { IConnection } from "@/components/Library/types";
import { userProfileQuery } from "@/hooks/settings";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export default function DefaultConnectionPicker() {
  const qc = useQueryClient();

  const { data: connections } = useQuery({
    queryKey: ["CONNECTIONS"],
    queryFn: async () => (await api.listConnections()).data.connections,
  });

  const { data: userInfo } = useQuery(userProfileQuery());

  const updateDefaultConnection = useMutation({
    mutationFn: async (defaultConnectionId: string | null) =>
      api.updateUserInfo({ default_connection_id: defaultConnectionId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["USER_INFO"] });
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-300">
        Default Connection
      </label>
      <select
        className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100"
        value={userInfo?.default_connection_id ?? ""}
        onChange={(e) => {
          const value = e.target.value || null;
          updateDefaultConnection.mutate(value);
        }}
        disabled={updateDefaultConnection.isPending}
      >
        <option value="">- None -</option>
        {(connections ?? []).map((connection: IConnection) => (
          <option key={connection.id} value={connection.id}>
            {connection.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500">
        Users will automatically chat against this connection.
      </p>
    </div>
  );
}
