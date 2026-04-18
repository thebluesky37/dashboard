import { IMessageWithResultsOut } from "@components/Library/types";
import { MessageResultRenderer } from "./MessageResultRenderer";
import { Spinner } from "../Spinner/Spinner";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export const Message = ({
  message,
  className = "",
  streaming = false,
}: {
  message: IMessageWithResultsOut;
  className?: string;
  streaming?: boolean;
}) => {
  return (
    <div
      className={classNames(
        "bg-white",
        "w-full text-gray-900",
        className
      )}
    >
      <div className="text-base md:max-w-2xl lg:max-w-2xl xl:max-w-2xl py-4 md:py-6 lg:px-0 m-auto">
        <div className="px-1 w-full flex flex-col gap-2 md:gap-6 scrollbar-hide">
          {message.message.content && (
            <div
              className={classNames(
                "px-2 md:px-0 flex w-full",
                message.message.role === "human"
                  ? "justify-end"
                  : "justify-start"
              )}
            >
              <div
                className={classNames(
                  "min-h-[20px] whitespace-pre-wrap break-words",
                  message.message.role === "human"
                    ? "max-w-[85%] rounded-2xl bg-gray-200 px-4 py-3"
                    : "w-full"
                )}
              >
                <div
                  className={classNames(
                    "markdown prose break-words text-gray-900",
                    message.message.role === "human" ? "max-w-none" : "w-full"
                  )}
                >
                  <div className="flex gap-2">
                    {streaming && (
                      <div className="flex items-center">
                        <Spinner />
                      </div>
                    )}
                    <p className="leading-loose">{message.message.content}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/** RESULTS: QUERY, DATA, PLOTS */}
          <MessageResultRenderer
            initialResults={message.results || []}
            messageId={message.message.id || ""}
          />
        </div>
      </div>
    </div>
  );
};
