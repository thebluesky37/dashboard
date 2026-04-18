import { useState, useRef } from "react";
import { UserCircleIcon } from "@heroicons/react/20/solid";
import MaskedInput from "@/components/Settings/MaskedInput";
import {
  useGetAvatar,
  useGetUserProfile,
  useUpdateUserInfo,
  useUpdateUserAvatar,
} from "@/hooks";
import { enqueueSnackbar } from "notistack";
import { Switch } from "@components/Catalyst/switch";
import _ from "lodash";
import { Input } from "@catalyst/input";
import { Button } from "@components/Catalyst/button";
import { IUserInfo } from "@components/Library/types";
import DefaultConnectionPicker from "@/components/Admin/DefaultConnectionPicker";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/config")({
  component: AdminConfigPage,
});

function AdminConfigPage() {
  const { data: profile } = useGetUserProfile();
  const [userInfo, setUserInfo] = useState(profile);
  const { data: avatarUrl } = useGetAvatar();
  const { mutate: updateUserInfo } = useUpdateUserInfo({
    onSuccess(data: IUserInfo) {
      enqueueSnackbar({
        variant: "success",
        message: "User info updated",
      });
      setUserInfo(data);
    },
  });
  const { mutate: updateAvatar, isPending } = useUpdateUserAvatar();

  const avatarUploadRef = useRef<HTMLInputElement>(null);

  function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) {
      throw new Error("You must select an image to upload.");
    }
    updateAvatar(event.target.files[0]);
  }

  const settingsChanged = !_.isEqual(userInfo, profile);

  function updateUserInfoWithKeys() {
    if (userInfo == null || profile == null) return;
    const updatedUserInfo = Object.fromEntries(
      Object.entries(userInfo).filter(
        // @ts-expect-error, we don't care that profile[key] is "any". It's not.
        ([key, value]) => profile[key] !== value
      )
    );
    updateUserInfo(updatedUserInfo);
  }

  return (
    <div>
      <main>
        <h1 className="sr-only">Settings</h1>

        {/* Settings forms */}
        <div className="divide-y divide-gray-200">
          {/* Admin Default Connection */}
          <div className="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
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
                    <UserCircleIcon className="text-gray-300 h-8 w-8 rounded-full " />
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
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        uploadAvatar(event)
                      }
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

          {/* Keys */}
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
                    htmlFor="current-password"
                    className="block text-md font-medium leading-6 text-gray-900"
                  >
                    OpenAI API Key
                  </label>
                  <div className="mt-2">
                    <MaskedInput
                      value={userInfo?.openai_api_key || ""}
                      autoFocus={false}
                      onChange={(value) =>
                        setUserInfo((prevUserInfo) => ({
                          ...prevUserInfo!,
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
                      full permissions{" "}
                    </a>
                    to use DataLine.
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
                        setUserInfo((prevUserInfo) => ({
                          ...prevUserInfo!,
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
                    htmlFor="current-password"
                    className="block text-md font-medium leading-6 text-gray-900"
                  >
                    LangSmith API Key (tracing)
                  </label>
                  <div className="mt-2">
                    <MaskedInput
                      value={userInfo?.langsmith_api_key || ""}
                      autoFocus={false}
                      onChange={(value) =>
                        setUserInfo((prevUserInfo) => ({
                          ...prevUserInfo!,
                          langsmith_api_key: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    Useful to visualize the LLM query graph and different
                    tools used.
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
                    <label
                      htmlFor="current-password"
                      className="block text-md font-medium leading-6 text-gray-900"
                    >
                      Send error reports
                    </label>
                    <Switch
                      name="allow_sentry"
                      color="green"
                      checked={userInfo?.sentry_enabled ?? true}
                      onChange={(value) =>
                        setUserInfo((prevUserInfo) => ({
                          ...prevUserInfo!,
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
                    <label
                      htmlFor="current-password"
                      className="block text-md font-medium leading-6 text-gray-900"
                    >
                      Send anonymized & safe analytics
                    </label>
                    <Switch
                      name="allow_analytics"
                      color="green"
                      checked={userInfo?.analytics_enabled ?? true}
                      onChange={(value) =>
                        setUserInfo((prevUserInfo) => ({
                          ...prevUserInfo!,
                          analytics_enabled: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    No user data or IP addresses collected, only generic
                    events to improve product development. Code is open
                    source, zero trust needed!
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
                <div className="col-span-full">
                  <div className="flex items-center gap-x-6">
                    <label
                      htmlFor="hide-sql"
                      className="block text-md font-medium leading-6 text-gray-900"
                    >
                      Hide SQL code blocks
                    </label>
                    <Switch
                      name="hide_sql"
                      color="green"
                      checked={userInfo?.hide_sql_preference ?? false}
                      onChange={(value) =>
                        setUserInfo((prevUserInfo) => ({
                          ...prevUserInfo!,
                          hide_sql_preference: value,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 pt-2">
                    When enabled, SQL code blocks will be hidden in conversations by default.
                    You can still view them by expanding the minimized blocks when needed.
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
      </main>
    </div>
  );
}
