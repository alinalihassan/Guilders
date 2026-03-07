import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared styles for triggers that should look like Input (same border, hover, focus). */
export const inputTriggerStyles =
  "flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-0 ring-offset-2 ring-offset-background transition-shadow duration-200 ease-out placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground hover:shadow-sm";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-0 ring-offset-2 ring-offset-background transition-shadow duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
