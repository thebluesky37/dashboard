import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { SetStateAction, forwardRef, useState } from "react";

type ExpandingInputProps = {
  onSubmit: (value: string) => void;
  disabled: boolean;
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const ExpandingInput = forwardRef<HTMLTextAreaElement, ExpandingInputProps>(
  ({ onSubmit, disabled }, ref) => {
    const [inputValue, setInputValue] = useState("");

    const handleChange = (e: {
      target: {
        value: SetStateAction<string>;
        style: { height: string };
        scrollHeight: any;
      };
    }) => {
      setInputValue(e.target.value);
      e.target.style.height = "auto"; // Reset textarea height
      e.target.style.height = `${e.target.scrollHeight}px`; // Set textarea height based on content
    };

    const handleSubmit = () => {
      if (disabled) return;
      if (inputValue.length === 0) return;
      onSubmit(inputValue);
      setInputValue("");
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();

        // Reset textarea height
        e.currentTarget.style.height = "auto";
      }
    };

    return (
      <div className="flex flex-col justify-center w-full relative mb-4">
        <textarea
          name="email"
          id="email"
          className={classNames(
            disabled
              ? "placeholder:text-gray-500 text-gray-500 bg-gray-100 focus:ring-0"
              : "placeholder:text-gray-400 text-gray-900 bg-white",
            "block rounded-xl border border-gray-300 p-4 shadow-sm sm:text-md sm:leading-6 resize-none pr-12 overflow-y-hidden mr-1"
          )}
          style={{ height: "auto" }}
          rows={1}
          placeholder="Enter your message here..."
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          ref={ref}
        />
        <div
          onClick={handleSubmit}
          className={classNames(
            inputValue.length > 0 && !disabled
              ? "text-gray-700 bg-gray-100 hover:cursor-pointer"
              : "",
            "group absolute right-0 mr-4 -rotate-90 text-gray-500 p-1 rounded-md transition-all duration-150"
          )}
        >
          <PaperAirplaneIcon
            className={classNames(
              inputValue.length > 0 ? "group-hover:-rotate-6" : "",
              "h-6 w-6 [&>path]:stroke-[2]"
            )}
          ></PaperAirplaneIcon>
        </div>
      </div>
    );
  }
);

export default ExpandingInput;
