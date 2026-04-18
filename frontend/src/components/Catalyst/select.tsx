import {
  Select as HeadlessSelect,
  type SelectProps as HeadlessSelectProps,
} from "@headlessui/react";
import { clsx } from "clsx";
import { forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, HeadlessSelectProps>(
  function Select({ className, multiple, ...props }, ref) {
    return (
      <span
        data-slot="control"
        className={clsx([
          className,

          // Basic layout
          "group relative block w-full",

          // Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
          "before:absolute before:inset-px before:rounded-[calc(theme(borderRadius.lg)-1px)] before:bg-white before:shadow",

          // Focus ring
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-inset after:ring-transparent sm:after:has-[[data-focus]]:ring-2 sm:after:has-[[data-focus]]:ring-blue-500",

          // Disabled state
          "has-[[data-disabled]]:opacity-50 before:has-[[data-disabled]]:bg-gray-950/5 before:has-[[data-disabled]]:shadow-none",
        ])}
      >
        <HeadlessSelect
          ref={ref}
          multiple={multiple}
          {...props}
          className={clsx([
            // Basic layout
            "relative block w-full appearance-none rounded-lg py-[calc(theme(spacing[2]))] sm:py-[calc(theme(spacing[1]))]",

            // Horizontal padding
            multiple
              ? "px-[calc(theme(spacing[3.5])-1px)] sm:px-[calc(theme(spacing.3)-1px)]"
              : "pl-[calc(theme(spacing[3.5])-1px)] pr-[calc(theme(spacing.10)-1px)] sm:pl-[calc(theme(spacing.3)-1px)] sm:pr-[calc(theme(spacing.9)-1px)]",

            // Options (multi-select)
            "[&_optgroup]:font-semibold",

            // Typography
            "text-xs text-gray-950 placeholder:text-gray-500 sm:text-sm/6",

            // Border
            "border border-gray-950/10 data-[hover]:border-gray-950/20",

            // Background color
            "bg-transparent",

            // Hide default focus styles
            "focus:outline-none",

            // Invalid state
            "data-[invalid]:border-red-500 data-[invalid]:data-[hover]:border-red-500",

            // Disabled state
            "data-[disabled]:border-gray-950/20 data-[disabled]:opacity-100",
          ])}
        />
      </span>
    );
  }
);
