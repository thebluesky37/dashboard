import { api } from "@/api";
import { IConnection } from "@/components/Library/types";
import { useQuery } from "@tanstack/react-query";

interface DefaultConnectionPickerProps {
  value: string | null | undefined;
  onChange: (connectionId: string | null) => void;
  disabled?: boolean;
}

export default function DefaultConnectionPicker({
  value,
  onChange,
  disabled = false,
}: DefaultConnectionPickerProps) {
  const { data: connectionsData } = useQuery({
    queryKey: ["CONNECTIONS"],
    queryFn: async () => (await api.listConnections()).data,
  });
  const connections = connectionsData?.connections;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-900">
        Default Connection
      </label>
      <select
        className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
        value={value ?? ""}
        onChange={(e) => {
          const selectedValue = e.target.value || null;
          onChange(selectedValue);
        }}
        disabled={disabled}
      >
        <option value="">- None -</option>
        {(connections ?? []).map((connection: IConnection) => (
          <option key={connection.id} value={connection.id}>
            {connection.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-600">
        Users will automatically chat against this connection.
      </p>
    </div>
  );
}
