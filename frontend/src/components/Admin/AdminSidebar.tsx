import { Link } from "@tanstack/react-router";

export default function AdminSidebar() {
  return (
    <nav className="w-60 flex-shrink-0 flex flex-col p-4 bg-gray-900 border-r border-gray-800 h-full">
      <span className="text-xs font-semibold uppercase text-gray-500 mb-3 px-2">
        Admin
      </span>
      <div className="flex flex-col gap-1">
        <Link
          to="/connections"
          className="px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 hover:text-white [&.active]:bg-gray-800 [&.active]:text-white"
        >
          Connections
        </Link>
        <Link
          to="/settings"
          className="px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 hover:text-white [&.active]:bg-gray-800 [&.active]:text-white"
        >
          Settings
        </Link>
      </div>
    </nav>
  );
}
