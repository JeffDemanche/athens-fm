import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type StackProps = ComponentProps<"div"> & {
  gap?: "sm" | "md" | "lg";
};

const gapClass = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-8",
} as const;

export function Stack({ gap = "md", className, ...props }: StackProps) {
  return (
    <div className={cn("flex flex-col", gapClass[gap], className)} {...props} />
  );
}
