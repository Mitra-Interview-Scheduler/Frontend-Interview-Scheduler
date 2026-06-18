import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectUiContextValue = {
  value?: string;
  hideSelectedFromMenu: boolean;
  open: boolean;
};

const SelectUiContext = React.createContext<SelectUiContextValue>({
  hideSelectedFromMenu: true,
  open: false,
});

type SelectProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
  hideSelectedFromMenu?: boolean;
};

const Select = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  onOpenChange,
  hideSelectedFromMenu = true,
  children,
  ...props
}: SelectProps) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = valueProp !== undefined;
  const isOpenControlled = openProp !== undefined;
  const currentValue = isControlled ? valueProp : uncontrolledValue;
  const isOpen = isOpenControlled ? Boolean(openProp) : uncontrolledOpen;

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isOpenControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isOpenControlled, onOpenChange],
  );

  return (
    <SelectUiContext.Provider value={{ value: currentValue, hideSelectedFromMenu, open: isOpen }}>
      <SelectPrimitive.Root
        value={valueProp}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        open={openProp}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectUiContext.Provider>
  );
};

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

type SelectContentProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
  hideSelectedFromMenu?: boolean;
};

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position, style, hideSelectedFromMenu, ...props }, ref) => {
  const uiContext = React.useContext(SelectUiContext);
  const shouldHideSelected = hideSelectedFromMenu ?? uiContext.hideSelectedFromMenu;
  const resolvedPosition = position ?? (shouldHideSelected ? "popper" : "item-aligned");

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={resolvedPosition}
        className={cn(
          "relative z-50 max-h-96 overflow-hidden rounded-md border border-border bg-card text-foreground shadow-lg backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          resolvedPosition === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        style={{
          ...(resolvedPosition === "popper"
            ? {
                width: "var(--radix-select-trigger-width)",
                minWidth: "var(--radix-select-trigger-width)",
                maxWidth: "var(--radix-select-trigger-width)",
              }
            : undefined),
          ...style,
        }}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="w-full p-0">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("px-3 py-2 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, value, ...props }, ref) => {
  const { value: selectedValue, hideSelectedFromMenu, open } = React.useContext(SelectUiContext);

  const hideInOpenMenu = hideSelectedFromMenu
    && open
    && selectedValue !== undefined
    && selectedValue !== ""
    && value === selectedValue;

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "ui-dropdown-option relative flex w-full min-w-full cursor-pointer select-none items-center gap-2 rounded-sm py-2 pl-3 pr-3 text-sm outline-none",
        "hover:bg-primary-light hover:text-foreground focus:bg-primary-light focus:text-foreground",
        "data-[highlighted]:bg-primary-light data-[highlighted]:text-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        hideInOpenMenu && "hidden",
        className,
      )}
      {...props}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-primary">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText className="min-w-0 flex-1">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
