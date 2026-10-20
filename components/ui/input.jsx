import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  // Defensive check to prevent React from crashing if an object is accidentally passed
  const safeProps = { ...props };
  if (typeof safeProps.value === "object" && safeProps.value !== null && !Array.isArray(safeProps.value)) {
    console.error("Input component received an object for 'value' prop on field:", safeProps.name, safeProps.value);
    safeProps.value = ""; // Fallback to prevent crash
  }

  // Prevent React uncontrolled-to-controlled warning when value is explicitly undefined
  if ('value' in safeProps && safeProps.value === undefined) {
    safeProps.value = "";
  }

  let safeType = type;
  if (typeof type === "object") {
    console.error("Input component received an object for 'type' prop:", type);
    safeType = "text";
  }

  return (
    <input
      type={safeType}
      className={cn(
        "flex h-9 w-[99%] mx-auto rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-not-allowed read-only:bg-muted/50 read-only:text-muted-foreground focus-visible:read-only:ring-0 md:text-sm",
        className
      )}
      ref={ref}
      {...safeProps}
    />
  );
});
Input.displayName = "Input";

export { Input };
