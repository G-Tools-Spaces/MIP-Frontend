"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Minimal accessible dropdown menu — click-to-open, ESC/outside to close.
 * Purposefully headless-radix-free to keep the bundle small at this phase.
 */
type TriggerProps = {
  onClick?: (e: React.MouseEvent) => void;
  "aria-haspopup"?: React.AriaAttributes["aria-haspopup"];
  "aria-expanded"?: React.AriaAttributes["aria-expanded"];
};

export const Dropdown: React.FC<{
  trigger: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  children: (close: () => void) => React.ReactNode;
}> = ({ trigger, align = "end", className, children }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setOpen((v) => !v);
    },
    [],
  );

  // If the trigger is itself a button-rendering element (a native <button> or
  // our <Button> component), clone it and attach the click/aria handlers.
  // Otherwise, wrap it in a <button> for correct semantics/keyboard support.
  // This avoids nested <button> elements (a hydration/DOM validity error).
  const triggerIsButton =
    React.isValidElement(trigger) &&
    (trigger.type === "button" || trigger.type === Button);

  const renderedTrigger = triggerIsButton ? (
    React.cloneElement(trigger as React.ReactElement<TriggerProps>, {
      onClick: (e: React.MouseEvent) => {
        (trigger as React.ReactElement<TriggerProps>).props.onClick?.(e);
        toggle(e);
      },
      "aria-haspopup": "menu",
      "aria-expanded": open,
    })
  ) : (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-haspopup="menu"
      aria-expanded={open}
    >
      {trigger}
    </button>
  );

  return (
    <div ref={ref} className="relative inline-block text-left">
      {renderedTrigger}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-2 min-w-[14rem] rounded-xl border border-slate-200 bg-white p-1 shadow-lg outline-none dark:border-slate-800 dark:bg-slate-900",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

export const DropdownItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { destructive?: boolean }
> = ({ className, destructive, ...props }) => (
  <button
    type="button"
    role="menuitem"
    className={cn(
      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none",
      "text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100",
      "dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800",
      destructive &&
        "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
      className,
    )}
    {...props}
  />
);

export const DropdownSeparator: React.FC = () => (
  <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
);

export const DropdownLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
    {children}
  </div>
);
