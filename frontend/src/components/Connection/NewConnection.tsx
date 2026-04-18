import { useState } from "react";
import { Radio, RadioField, RadioGroup } from "@catalyst/radio";
import { Description, Label } from "@catalyst/fieldset";
import { SampleSelector } from "./SampleSelector";
import ConnectionCreator from "./ConnectionCreator";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const NewConnection = ({ onDone }: { onDone?: () => void }) => {
  // Flow in this component:
  // A. Enter name of connection
  // B. Select radio deciding if SAMPLE or CUSTOM connection
  // C. If SAMPLE, show SampleSelector component
  // D. If CUSTOM, show ConnectionCreator component
  const [connectionName, setConnectionName] = useState("");
  const [isLoading] = useState(false);

  type RadioValue = "sample" | "custom" | null;
  const [selectedRadio, setSelectedRadio] = useState<RadioValue>(null);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setConnectionName(value);
  };

  return (
    <div className="w-full h-full relative flex flex-col mt-16 lg:mt-0 bg-white dark:bg-slate-900">
      <div className="flex flex-col lg:mt-0 p-4 lg:p-24 bg-white dark:bg-slate-900">
        <div className="">
          <h2 className="text-base font-semibold leading-7 text-gray-900">
            New Connection
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Add a new database connection
          </p>

          <div className="mt-5 max-w-2xl">
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
                disabled={isLoading}
                autoComplete="one-time-code"
                value={connectionName}
                onChange={handleNameChange}
                placeholder="Postgres Prod"
                className={classNames(
                  isLoading
                    ? "animate-pulse bg-gray-100 text-gray-400"
                    : "bg-white text-gray-900",
                  "block w-full rounded-md border border-gray-300 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 px-3"
                )}
              />
            </div>
          </div>

          <div className="mt-12 sm:col-span-4">
            <label
              htmlFor="dsn"
              className="block text-sm font-medium leading-6 text-gray-900 mb-4"
            >
              Data Source Type
            </label>

            <RadioGroup
              defaultValue=""
              onChange={(event) => setSelectedRadio(event as RadioValue)}
            >
              <RadioField>
                <Radio value="sample" />
                <Label className="cursor-pointer text-gray-900">
                  Choose a sample dataset
                </Label>
                <Description className="text-gray-600">
                  Samples allow you to get started quickly
                </Description>
              </RadioField>
              <RadioField>
                <Radio value="custom" />
                <Label className="cursor-pointer text-gray-900">
                  Setup a custom connection
                </Label>
                <Description className="text-gray-600">
                  Connect to your local databases or files
                </Description>
              </RadioField>
            </RadioGroup>
          </div>
        </div>

        <div className="mt-8">
          {selectedRadio === "sample" && (
            <SampleSelector name={connectionName} onDone={onDone} />
          )}
          {selectedRadio === "custom" && (
            <ConnectionCreator name={connectionName} onDone={onDone} />
          )}
        </div>
      </div>
    </div>
  );
};
