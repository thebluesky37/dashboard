import { useState } from "react";
import { Input } from "@catalyst/input";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface MaskedInputProps {
  value?: string;
  onChange: (value: string) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export default function MaskedInput({
  value,
  onChange,
  onKeyUp,
  autoFocus = true,
  placeholder,
}: MaskedInputProps) {
  const [isMasked, setIsMasked] = useState(true);

  const Icon = isMasked ? EyeSlashIcon : EyeIcon;
  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <Input
        type={isMasked ? "password" : "text"}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={(e) => {
          if (onKeyUp) onKeyUp(e);
        }}
        value={value}
        className="font-mono"
        placeholder={placeholder}
      />
      <div className="rounded-full hover:bg-gray-100 p-1">
        <Icon
          className="h-6 w-6 text-gray-500 hover:text-gray-700 opacity-70 cursor-pointer"
          onClick={() => setIsMasked((prev) => !prev)}
        />
      </div>
    </div>
  );
}
