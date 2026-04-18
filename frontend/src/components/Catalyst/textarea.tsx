import {
  Textarea as HeadlessTextarea,
  type TextareaProps as HeadlessTextareaProps,
} from "@headlessui/react";
import { clsx } from "clsx";
import { forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  { resizable?: boolean } & HeadlessTextareaProps
>(function Textarea({ className, resizable = true, ...props }, ref) {
  return (
    <span
      data-slot="control"
      className={clsx([
        className,

        // Basic layout
        "relative block w-full",

        // Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
        "before:absolute before:inset-px before:rounded-[calc(theme(borderRadius.lg)-1px)] before:bg-white before:shadow",

        // Focus ring
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-inset after:ring-transparent sm:after:focus-within:ring-2 sm:after:focus-within:ring-blue-500",

        // Disabled state
        "has-[[data-disabled]]:opacity-50 before:has-[[data-disabled]]:bg-gray-950/5 before:has-[[data-disabled]]:shadow-none",
      ])}
    >
      <HeadlessTextarea
        ref={ref}
        className={clsx([
          // Basic layout
          "relative block h-full w-full appearance-none rounded-lg px-[calc(theme(spacing[3.5])-1px)] py-[calc(theme(spacing[2.5])-1px)] sm:px-[calc(theme(spacing.3)-1px)] sm:py-[calc(theme(spacing[1.5])-1px)]",

          // Typography
          "text-base/6 text-gray-950 placeholder:text-gray-500 sm:text-sm/6",

          // Border
          "border border-gray-950/10 data-[hover]:border-gray-950/20",

          // Background color
          "bg-transparent",

          // Hide default focus styles
          "focus:outline-none",

          // Invalid state
          "data-[invalid]:border-red-500 data-[invalid]:data-[hover]:border-red-500",

          // Disabled state
          "disabled:border-gray-950/20",

          // Resizable
          resizable ? "resize-y" : "resize-none",
        ])}
        {...props}
      />
    </span>
  );
});
