import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type TextOwnProps<T extends ElementType> = {
  as?: T;
  tone?: "default" | "muted" | "destructive";
  size?: "sm" | "md" | "lg" | "xl" | "display";
};

type TextProps<T extends ElementType = "p"> = TextOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps<T>>;

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl font-semibold tracking-tight",
  display: "text-4xl font-semibold tracking-tight sm:text-5xl",
} as const;

const toneClass = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
} as const;

export function Text<T extends ElementType = "p">({
  as,
  tone = "default",
  size = "md",
  className,
  ...props
}: TextProps<T>) {
  const Comp = as ?? "p";

  return (
    <Comp
      className={cn(sizeClass[size], toneClass[tone], className)}
      {...props}
    />
  );
}
