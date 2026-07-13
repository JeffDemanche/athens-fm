import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type SpinnerProps = ComponentProps<"div">;

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground",
        className,
      )}
      {...props}
    />
  );
}
