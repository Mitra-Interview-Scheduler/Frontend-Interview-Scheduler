import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

export type SearchableSelectEmptyOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  emptyOption?: SearchableSelectEmptyOption;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

function getOptionKeywords(option: SearchableSelectOption | SearchableSelectEmptyOption) {
  const keywords = [option.label];
  if ("keywords" in option && option.keywords) {
    keywords.push(option.keywords);
  }
  return keywords;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  label,
  placeholder,
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  emptyOption,
  disabled = false,
  className,
  "aria-invalid": ariaInvalid,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const resolvedPlaceholder = placeholder ?? (label ? `Select ${label}` : "Select an option");

  const menuOptions = React.useMemo(
    () => (emptyOption ? [emptyOption, ...options] : options),
    [emptyOption, options],
  );

  const isUnset = !value || value === emptyOption?.value;
  const selectedOption = options.find((option) => option.value === value);
  const displayText = isUnset ? resolvedPlaceholder : (selectedOption?.label ?? resolvedPlaceholder);

  const closeMenu = React.useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const openMenu = React.useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeMenu();
      }
    };

    // Defer so the opening click does not immediately close the menu.
    const timerId = window.setTimeout(() => {
      document.addEventListener("mousedown", handlePointerDown);
    }, 0);

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, closeMenu]);

  return (
    <div
      ref={anchorRef}
      className={cn("relative w-full", open && "z-[200]")}
    >
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        className={cn(
          "h-10 w-full justify-between px-3 py-2 font-normal",
          isUnset && "text-muted-foreground",
          ariaInvalid && "border-red-500 focus-visible:ring-red-500",
          className,
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute left-0 top-full z-[200] mt-1 w-full overflow-hidden rounded-md border border-border bg-card text-foreground shadow-lg"
        >
          <Command
            filter={(itemValue, searchTerm, keywords) => {
              const haystack = [itemValue, ...(keywords ?? [])].join(" ").toLowerCase();
              return haystack.includes(searchTerm.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[240px]">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {menuOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={getOptionKeywords(option)}
                    onSelect={() => {
                      onValueChange(option.value);
                      closeMenu();
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        !isUnset && value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
