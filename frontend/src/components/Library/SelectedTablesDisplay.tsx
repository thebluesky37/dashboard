export const SelectedTablesDisplay = ({ tables }: { tables: string[] }) => {
  return (
    <div className="flex space-x-2 items-center overflow-x-scroll">
      <span className="text-gray-600 text-sm font-normal">
        Detected tables{" "}
      </span>
      {tables.map((table) => (
        <div
          key={table}
          className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200"
        >
          {table}
        </div>
      ))}
    </div>
  );
};
