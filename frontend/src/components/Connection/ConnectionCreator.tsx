import { Field, Fieldset, Label, Legend } from "@catalyst/fieldset";
import { Radio, RadioField, RadioGroup } from "@catalyst/radio";
import React, { useRef, useState } from "react";
import { Input } from "@catalyst/input";
import { Button } from "@catalyst/button";
import { enqueueSnackbar } from "notistack";
import { CloudArrowUpIcon, DocumentCheckIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useCreateConnection, useCreateFileConnection } from "@/hooks";
import { DatabaseFileType } from "@components/Library/types";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const FileDragAndDrop = ({
  currentFile,
  setFile,
  fileTypeLabel,
}: {
  currentFile: File | undefined;
  setFile: (file: File | undefined) => void;
  fileTypeLabel: string;
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setFile(event.dataTransfer.files[0]);
    }
  };
  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }
  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }
  return (
    <div
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      className={classNames(
        "mt-2 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10",
        dragActive ? "bg-gray-50" : ""
      )}
    >
      <div className={classNames(currentFile ? "" : "hidden", "text-center")}>
        <div className="relative inline-block">
          <DocumentCheckIcon
            className="h-12 w-12 text-gray-400"
            aria-hidden="true"
          />
          <div
            onClick={() => setFile(undefined)}
            className="absolute -right-1 -top-1 cursor-pointer block h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-500"
          >
            <XMarkIcon
              className="h-3 w-3 text-white [&>path]:stroke-[4]"
              aria-hidden="true"
            />
          </div>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {currentFile && currentFile.name}
        </p>
      </div>
      <div className={classNames(currentFile ? "hidden" : "", "text-center")}>
        <CloudArrowUpIcon
          onClick={handleFileClick}
          className="cursor-pointer mx-auto h-12 w-12 text-gray-400"
          aria-hidden="true"
        />
        <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
          <label
            htmlFor="file-upload"
            className="px-1 relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 border border-gray-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 focus-within:ring-offset-white hover:text-indigo-700"
          >
            <span>Upload a file</span>
            {/** Set a key so that the input is re-rendered and cleared when the file is removed */}
            <input
              ref={fileInputRef}
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              key={currentFile?.name}
            />
          </label>
          <p>or drag and drop</p>
        </div>
        <p className="text-xs leading-5 text-gray-600 px-12 mt-4">
          Creates a copy of your {fileTypeLabel} in RLDashboard. Changes you make
          to the file will not be accessible to RLDashboard as it will work on the
          copy you upload.
        </p>
      </div>
    </div>
  );
};

type RadioValue = DatabaseFileType | "database" | null;
const fileTypeLabelMap: { [K in DatabaseFileType]: string } = {
  sqlite: "SQLite data file",
  csv: "CSV file",
  sas7bdat: "sas7bdat file",
  excel: "Excel file",
};

const ConnectionCreator = ({ name = null, onDone }: { name: string | null; onDone?: () => void }) => {
  const [selectedRadio, setSelectedRadio] = useState<RadioValue>(null);
  const [dsn, setDsn] = useState<string | null>(null);
  const [file, setFile] = useState<File>();
  const { mutate: createConnection, isPending } = useCreateConnection();
  const { mutate: createFileConnection, isPending: isFilePending } =
    useCreateFileConnection();

  const handleCustomCreate = async () => {
    // Call api with name and dsn
    if (!name || !dsn) {
      enqueueSnackbar({
        variant: "info",
        message: "Please enter a name and dsn for this connection",
      });
      return;
    }
    createConnection(
      { dsn, name, isSample: false },
      {
        onSuccess: () => {
          enqueueSnackbar({
            variant: "success",
            message: "Connection created",
          });
          onDone?.();
        },
      }
    );
  };

  const handleFileCreate = async (type: DatabaseFileType) => {
    if (!file) {
      enqueueSnackbar({
        variant: "info",
        message: "Please add a file",
      });
      return;
    }

    if (!name) {
      enqueueSnackbar({
        variant: "info",
        message: "Please add a name",
      });
      return;
    }

    // Limit file size to 500MB
    if (file.size > 1024 * 1024 * 500) {
      enqueueSnackbar({
        variant: "info",
        message: "File size exceeds 500MB limit",
      });
      return;
    }

    createFileConnection(
      { file, name, type },
      {
        onSuccess: () => {
          enqueueSnackbar({
            variant: "success",
            message: "Connection created",
          });
          onDone?.();
        },
      }
    );
  };

  return (
    <>
      <Fieldset>
        <Legend>Create a custom connection</Legend>
        <RadioGroup
          defaultValue=""
          onChange={(selection: string) =>
            setSelectedRadio(selection as RadioValue)
          }
        >
          <RadioField>
            <Radio value="database" />
            <Label className="cursor-pointer text-gray-900">
              Postgres, MySQL, Snowflake, or MS SQL Server connection string
            </Label>
          </RadioField>
          <RadioField>
            <Radio value="sqlite" />
            <Label className="cursor-pointer text-gray-900">SQLite file</Label>
          </RadioField>
          <RadioField>
            <Radio value="csv" />
            <Label className="cursor-pointer text-gray-900">CSV file</Label>
          </RadioField>
          <RadioField>
            <Radio value="excel" />
            <Label className="cursor-pointer text-gray-900">Excel file</Label>
          </RadioField>
          <RadioField>
            <Radio value="sas7bdat" />
            <Label className="cursor-pointer text-gray-900">sas7bdat file</Label>
          </RadioField>
        </RadioGroup>
      </Fieldset>
      <div className="mt-10 max-w-2xl">
        {selectedRadio === "database" ? (
          <div>
            <Field>
              <Label className="text-gray-900">Connection DSN</Label>
              <Input
                type="text"
                placeholder="postgres://myuser:mypassword@localhost:5432/mydatabase"
                onChange={(e) => setDsn(e.target.value)}
              />
            </Field>
            <Button
              color="light"
              className="cursor-pointer mt-4"
              onClick={handleCustomCreate}
              disabled={isPending}
            >
              Create connection
            </Button>
          </div>
        ) : (
          selectedRadio && (
            <div>
              <Field>
                <Label className="text-gray-900">{fileTypeLabelMap[selectedRadio]}</Label>
                <FileDragAndDrop
                  setFile={setFile}
                  currentFile={file}
                  fileTypeLabel={fileTypeLabelMap[selectedRadio]}
                />
              </Field>
              <Button
                color="light"
                className="cursor-pointer mt-4"
                onClick={() => handleFileCreate(selectedRadio)}
                disabled={isFilePending}
              >
                Create connection
              </Button>
            </div>
          )
        )}
      </div>
    </>
  );
};

export default ConnectionCreator;
