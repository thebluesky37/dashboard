import { useCallback, useEffect, useState } from "react";
import { IConnectionOptions, IEditConnection } from "@components/Library/types";
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AlertIcon, AlertModal } from "@components/Library/AlertModal";
import {
  useDeleteConnection,
  useGetConnection,
  useGetConversations,
  useUpdateConnection,
  useRefreshConnectionSchema,
} from "@/hooks";
import { Button } from "../Catalyst/button";
import { Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Switch } from "@components/Catalyst/switch";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const SchemaEditor = ({
  options,
  setOptions,
}: {
  options: IConnectionOptions;
  setOptions: (newOptions: IConnectionOptions) => void;
}) => {
  const [expanded, setExpanded] = useState(
    Object.fromEntries(options.schemas.map((schema) => [schema.name, false]))
  );

  return (
    <div className="mt-2 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
      {options.schemas.map((schema, schema_index) =>
        schema.tables.length === 0 ? null : (
          <div className="flex flex-col" key={schema_index}>
            <div className="flex w-full items-center p-4" key={schema_index}>
              <Switch
                color="green"
                name="select_schema"
                checked={schema.enabled}
                onChange={(checked) =>
                  setOptions({
                    schemas: options.schemas.map((prev_schema, prev_idx) =>
                      prev_idx === schema_index
                        ? {
                            ...prev_schema,
                            enabled: checked,
                            tables: prev_schema.tables.map((table) => ({
                              ...table,
                              enabled: checked,
                            })),
                          }
                        : prev_schema
                    ),
                  })
                }
              />
              <div
                className="group flex w-full items-center cursor-pointer"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [schema.name]: !prev[schema.name],
                  }))
                }
              >
                <span
                  className={classNames(
                    "ml-4 text-sm/6 font-medium grow",
                    schema.enabled
                      ? "text-gray-900 group-hover:text-gray-700"
                      : "text-gray-400"
                  )}
                >
                  {schema.name}
                </span>
                <ChevronDownIcon
                  className={classNames(
                    "size-5 fill-gray-400 group-hover:fill-gray-500",
                    expanded[schema.name] ? "rotate-180" : ""
                  )}
                />
              </div>
            </div>

            <Transition show={expanded[schema.name] || false}>
              <div className="transition ease-in-out translate-x-0 data-[closed]:opacity-0 data-[closed]:-translate-y-3">
                {schema.tables.map((table, table_index) => (
                  <div className="p-4 pt-0 pl-12" key={table_index}>
                    <div className="flex w-full items-center" key={schema_index}>
                      <Switch
                        color="green"
                        name="select_schema"
                        checked={table.enabled && schema.enabled}
                        onChange={(checked) =>
                          setOptions({
                            schemas: options.schemas.map(
                              (prev_schema, prev_idx) =>
                                prev_idx === schema_index
                                  ? {
                                      ...prev_schema,
                                      tables: prev_schema.tables.map(
                                        (table, inner_table_idx) =>
                                          inner_table_idx === table_index
                                            ? { ...table, enabled: checked }
                                            : table
                                      ),
                                    }
                                  : prev_schema
                            ),
                          })
                        }
                      />
                      <span
                        className={classNames(
                          "ml-4 text-sm/5",
                          schema.enabled && table.enabled
                            ? "text-gray-900"
                            : "text-gray-400"
                        )}
                      >
                        {table.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Transition>
          </div>
        )
      )}
    </div>
  );
};

export const ConnectionEditor = ({
  connectionId,
  onClose,
}: {
  connectionId: string;
  onClose: () => void;
}) => {
  const [unsavedChanges, setUnsavedChanges] = useState<boolean>(false);
  const [showCancelAlert, setShowCancelAlert] = useState<boolean>(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);

  const { data, isLoading } = useGetConnection(connectionId);
  const { data: conversationsData } = useGetConversations();
  const relatedConversations =
    conversationsData?.filter(
      (conversation) => conversation.connection_id === connectionId
    ) ?? [];

  const connection = data;

  const { mutate: deleteConnection } = useDeleteConnection({
    onSuccess() {
      onClose();
    },
  });

  const { mutate: updateConnection } = useUpdateConnection({
    onSuccess() {
      onClose();
    },
  });

  const { mutate: refreshSchema, isPending: isRefreshing } =
    useRefreshConnectionSchema((data) => {
      setEditFields((prev) => ({ ...prev, options: data.options }));
    });

  const [editFields, setEditFields] = useState<IEditConnection>({
    name: "",
    dsn: "",
    instructions: null,
  });

  useEffect(() => {
    setEditFields((prev) => ({
      name: connection?.name || prev.name,
      dsn: connection?.dsn || prev.dsn,
      options: connection?.options || prev.options,
      instructions: connection?.instructions ?? prev.instructions,
    }));
  }, [connection]);

  const handleBack = useCallback(() => {
    if (unsavedChanges) {
      setShowCancelAlert(true);
    } else {
      onClose();
    }
  }, [onClose, unsavedChanges]);

  useEffect(() => {
    const handleKeyPress = (event: { key: string }) => {
      if (event.key === "Escape") handleBack();
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleBack, unsavedChanges]);

  function handleDelete() {
    if (!connectionId) return;
    deleteConnection(connectionId);
  }

  function handleSubmit() {
    if (!unsavedChanges) {
      onClose();
      return;
    }
    if (!connectionId) return;
    updateConnection({
      id: connectionId,
      payload: {
        name: editFields.name,
        ...(editFields.dsn !== connection?.dsn && { dsn: editFields.dsn }),
        options: editFields.options,
        instructions: editFields.instructions,
      },
    });
  }

  const inputClass = classNames(
    isLoading ? "animate-pulse bg-gray-100 text-gray-400" : "bg-white text-gray-900",
    "block w-full rounded-md border border-gray-300 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 px-3"
  );

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <AlertModal
        isOpen={showCancelAlert}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes. Discard changes?"
        okText="OK"
        icon={AlertIcon.Warning}
        onSuccess={() => {
          setShowCancelAlert(false);
          onClose();
        }}
        onCancel={() => setShowCancelAlert(false)}
      />
      <AlertModal
        isOpen={showDeleteAlert}
        title="Delete Connection?"
        message={`This will delete ${relatedConversations.length} related conversation(s)!`}
        okText="Delete"
        icon={AlertIcon.Warning}
        onSuccess={() => {
          setShowDeleteAlert(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteAlert(false)}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit connection
          </h2>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 gap-x-6">
          <div className="sm:col-span-3">
            <label
              htmlFor="name"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Name
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="name"
                id="name"
                value={editFields.name}
                onChange={(e) => {
                  setEditFields({ ...editFields, name: e.target.value });
                  setUnsavedChanges(true);
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label
              htmlFor="dsn"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Database Connection String
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="dsn"
                id="dsn"
                value={editFields.dsn}
                onChange={(e) => {
                  setEditFields({ ...editFields, dsn: e.target.value });
                  setUnsavedChanges(true);
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label
              htmlFor="instructions"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Instructions
            </label>
            <div className="mt-2">
              <textarea
                name="instructions"
                id="instructions"
                rows={5}
                value={editFields.instructions ?? ""}
                onChange={(e) => {
                  setEditFields({
                    ...editFields,
                    instructions: e.target.value || null,
                  });
                  setUnsavedChanges(true);
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <div className="flex items-center mb-2 gap-x-2">
              <label
                htmlFor="schema"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Schema options
              </label>
              <Button
                onClick={() => connectionId && refreshSchema(connectionId)}
                plain
                disabled={isRefreshing}
              >
                <ArrowPathIcon
                  className={classNames(
                    "w-5 h-5 text-gray-500",
                    isRefreshing ? "animate-spin" : ""
                  )}
                />
              </Button>
            </div>
            {editFields.options && (
              <SchemaEditor
                options={editFields.options}
                setOptions={(newOptions) => {
                  setEditFields((prev) => ({ ...prev, options: newOptions }));
                  setUnsavedChanges(true);
                }}
              />
            )}
          </div>

          <div className="sm:col-span-6 flex items-center justify-end gap-x-3 pt-2 border-t border-gray-200">
            <Button
              outline
              onClick={() => {
                if (relatedConversations.length > 0) {
                  setShowDeleteAlert(true);
                } else {
                  handleDelete();
                }
              }}
            >
              Delete
            </Button>
            <Button outline onClick={handleBack}>
              Cancel
            </Button>
            <Button color="light" onClick={handleSubmit}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
