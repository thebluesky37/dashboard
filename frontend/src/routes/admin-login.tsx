import { adminLogin } from "@/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await adminLogin(username, password);
      navigate({ to: "/connections" });
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-80 p-6 bg-gray-900 rounded-lg"
      >
        <h1 className="text-lg font-semibold text-gray-100">Admin Login</h1>
        <input
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 rounded py-2 text-sm font-medium text-white"
        >
          Login
        </button>
      </form>
    </div>
  );
}
