import { checkAdminAuth, adminLogin, adminLogout } from "@/api";
import { ConnectionSelector } from "@/components/Connection/ConnectionSelector";
import { ConnectionEditor } from "@/components/Connection/ConnectionEditor";
import { NewConnection } from "@/components/Connection/NewConnection";
import DefaultConnectionPicker from "@/components/Admin/DefaultConnectionPicker";
import MaskedInput from "@/components/Settings/MaskedInput";
import { Switch } from "@/components/Catalyst/switch";
import { Input } from "@/components/Catalyst/input";
import { Button } from "@/components/Catalyst/button";
import {
  useGetAvatar,
  useGetUserProfile,
  useUpdateUserInfo,
  useUpdateUserAvatar,
} from "@/hooks";
import { IUserInfo } from "@/components/Library/types";
import { UserCircleIcon } from "@heroicons/react/20/solid";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { enqueueSnackbar } from "notistack";
import _ from "lodash";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type AuthState = "loading" | "unauthenticated" | "authenticated";
type AdminView =
  | "panel"
  | "new-connection"
  | { type: "edit-connection"; id: string };

function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [view, setView] = useState<AdminView>("panel");

  useEffect(() => {
    checkAdminAuth().then((ok) =>
      setAuthState(ok ? "authenticated" : "unauthenticated")
    );
  }, []);

  if (authState === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <AdminLoginForm onSuccess={() => setAuthState("authenticated")} />;
  }

  if (view === "new-connection") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NewConnection onDone={() => setView("panel")} />
      </div>
    );
  }

  if (typeof view === "object" && view.type === "edit-connection") {
    return (
      <ConnectionEditor
        connectionId={view.id}
        onClose={() => setView("panel")}
      />
    );
  }

  async function handleLogout() {
    await adminLogout();
    setAuthState("unauthenticated");
    setView("panel");
  }

  return (
    <AdminPanel
      onNewConnection={() => setView("new-connection")}
      onEditConnection={(id) => setView({ type: "edit-connection", id })}
      onLogout={handleLogout}
    />
  );
}

function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await adminLogin(username, password);
      onSuccess();
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-80 p-6 bg-white rounded-lg border border-gray-200 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-gray-900">Admin Login</h1>
        <input
          className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
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

function AdminPanel({
  onNewConnection,
  onEditConnection,
  onLogout,
}: {
  onNewConnection: () => void;
  onEditConnection: (id: string) => void;
  onLogout: () => void;
}) {
  const { data: profile } = useGetUserProfile();
  const [userInfo, setUserInfo] = useState(profile);
  const { data: avatarUrl } = useGetAvatar();
  const { mutate: updateUserInfo } = useUpdateUserInfo({
    onSuccess(data: IUserInfo) {
      enqueueSnackbar({ variant: "success", message: "User info updated" });
      setUserInfo(data);
    },
  });
  const { mutate: updateAvatar, isPending } = useUpdateUserAvatar();
  const avatarUploadRef = useRef<HTMLInputElement>(null);

  function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return;
    updateAvatar(event.target.files[0]);
  }

  const settingsChanged = !_.isEqual(userInfo, profile);

  function updateUserInfoWithKeys() {
    if (userInfo == null || profile == null) return;
    const updatedUserInfo = Object.fromEntries(
      Object.entries(userInfo).filter(
        // @ts-expect-error profile[key] is not typed
        ([key, value]) => profile[key] !== value
      )
    );
    updateUserInfo(updatedUserInfo);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
          <button
            type="button"
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Connections */}
          <div className="px-4 pb-6 sm:px-6 lg:px-8">
            <h2 className="text-base font-semibold leading-7 text-gray-900 mb-4">
              Connections
            </h2>
            <ConnectionSelector
              onNewConnection={onNewConnection}
              onEditConnection={onEditConnection}
            />
          </div>

          {/* Admin Default Connection */}
          <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Admin Settings
              </h2>
            </div>
            <div className="md:col-span-2">
              <DefaultConnectionPicker
                value={userInfo?.default_connection_id}
                onChange={(defaultConnectionId) =>
                  setUserInfo((prevUserInfo) => ({
                    ...prevUserInfo!,
                    default_connection_id: defaultConnectionId,
                  }))
                }
              />
            </div>
          </div>

          {/* Personal info */}
          <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Personal Information
              </h2>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                <div className="col-span-full flex items-center gap-x-8">
                  {avatarUrl ? (
                    <img
                      className="h-24 w-24 flex-none rounded-lg bg-gray-800 object-cover"
                      src={avatarUrl}
                      alt=""
                    />
                  ) : (
                    <UserCircleIcon className="text-gray-300 h-8 w-8 rounded-full" />
                  )}
                  <div>
                    <button
                      type="button"
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
                      onClick={() => avatarUploadRef.current?.click()}
                    >
                      Change profile pic
                    </button>
                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      Images only, 5MB max.
                    </p>
                    <input
                      style={{
                        visibility: "hidden",
                        position: "absolute",
                        width: "1rem",
                      }}
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={uploadAvatar}
                      disabled={isPending}
                      ref={avatarUploadRef}
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="first-name"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    First name
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="first-name"
                      id="first-name"
                      autoComplete="given-name"
                      className="block w-full rounded-md border border-gray-300 bg-white py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                      value={userInfo?.name || ""}
                      onChange={(event) =>
                        setUserInfo((prevUserInfo) => ({
                          ...prevUserInfo!,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                API Keys
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                Update your API keys.
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                <div className="col-span-full">
                  <label
                    htmlFor="openai-key"
                    className="block text-md font-medium leading-6 text-gray-900"
                  >
                    OpenAI API Key
                  </label>
                  <div className="mt-2">
                    <MaskedInput
                      value={userInfo?.openai_api_key || ""}
                      autoFocus={false}
                      onChange={(value) =>
                        setUserInfo((prev) => ({
                          ...prev!,
                          openai_api_key: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 pt-2">
                    Please setup your API key with{" "}
                    <a
                      className="underline"
                      target="_blank"
                      href="https://help.openai.com/en/articles/8867743-assign-api-key-permissions"
                    >
                      full permissions
                    </a>{" "}
                    to use RLDashboard.
                  </p>
                </div>

                <div className="col-span-full">
                  <label
                    htmlFor="base-url"
                    className="block text-md font-medium leading-6 text-gray-900"
                  >
                    OpenAI Base URL
                  </label>
                  <div className="mt-2 mr-9 sm:mr-11">
                    <Input
                      type="text"
                      autoComplete="off"
                      name="base-url"
                      id="base-url"
                      onChange={(event) =>
                        setUserInfo((prev) => ({
                          ...prev!,
                          openai_base_url: event.target.value,
                        }))
                      }
                      value={userInfo?.openai_base_url || ""}
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 pt-2">
                    Base URL path for API requests, leave blank if not using a
                    proxy or service emulator.
                  </p>
                </div>

                <div className="col-span-full">
                  <label
                    htmlFor="langsmith-key"
                    className="block text-md font-medium leading-6 text-gray-900"
                  >
                    LangSmith API Key (tracing)
                  </label>
                  <div className="mt-2">
                    <MaskedInput
                      value={userInfo?.langsmith_api_key || ""}
                      autoFocus={false}
                      onChange={(value) =>
                        setUserInfo((prev) => ({
                          ...prev!,
                          langsmith_api_key: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    Useful to visualize the LLM query graph and different tools
                    used.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
            <div>
              <h2 className="text-base font-semibold leading-7 text-gray-900">
                Preferences
              </h2>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                <div className="col-span-full">
                  <div className="flex items-center gap-x-6">
                    <label className="block text-md font-medium leading-6 text-gray-900">
                      Send error reports
                    </label>
                    <Switch
                      name="allow_sentry"
                      color="green"
                      checked={userInfo?.sentry_enabled ?? true}
                      onChange={(value) =>
                        setUserInfo((prev) => ({
                          ...prev!,
                          sentry_enabled: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    Send technical errors to our Sentry instance to help us
                    debug errors. Disable this if you're using sensitive data.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                <div className="col-span-full">
                  <div className="flex items-center gap-x-6">
                    <label className="block text-md font-medium leading-6 text-gray-900">
                      Send anonymized & safe analytics
                    </label>
                    <Switch
                      name="allow_analytics"
                      color="green"
                      checked={userInfo?.analytics_enabled ?? true}
                      onChange={(value) =>
                        setUserInfo((prev) => ({
                          ...prev!,
                          analytics_enabled: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    No user data or IP addresses collected, only generic events
                    to improve product development.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                <div className="col-span-full">
                  <div className="flex items-center gap-x-6">
                    <label className="block text-md font-medium leading-6 text-gray-900">
                      Hide SQL code blocks
                    </label>
                    <Switch
                      name="hide_sql"
                      color="green"
                      checked={userInfo?.hide_sql_preference ?? false}
                      onChange={(value) =>
                        setUserInfo((prev) => ({
                          ...prev!,
                          hide_sql_preference: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    When enabled, SQL code blocks will be hidden in
                    conversations by default.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                <div className="col-span-full">
                  <div className="flex items-center gap-x-6">
                    <label className="block text-md font-medium leading-6 text-gray-900">
                      Hide data results
                    </label>
                    <Switch
                      name="hide_data_results"
                      color="green"
                      checked={userInfo?.hide_data_results ?? false}
                      onChange={(value) =>
                        setUserInfo((prev) => ({
                          ...prev!,
                          hide_data_results: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    When enabled, table results will be hidden from the conversation view while charts remain visible.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex">
                <Button
                  color="light"
                  disabled={!settingsChanged}
                  onClick={updateUserInfoWithKeys}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
