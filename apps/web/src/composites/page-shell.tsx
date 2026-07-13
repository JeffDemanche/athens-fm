import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type PageShellProps = ComponentProps<"main"> & {
  narrow?: boolean;
  mobileSafe?: boolean;
};

export function PageShell({
  className,
  narrow = false,
  mobileSafe = false,
  children,
  ...props
}: PageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full flex-col",
        narrow ? "max-w-3xl" : "max-w-5xl",
        mobileSafe
          ? "px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
          : "px-6 py-16",
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}

type BrandLockupProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function BrandLockup({
  eyebrow = "Athens FM",
  title,
  description,
}: BrandLockupProps) {
  return (
    <Stack gap="sm">
      <Text
        as="p"
        size="sm"
        tone="muted"
        className="font-medium tracking-[0.2em] uppercase"
      >
        {eyebrow}
      </Text>
      <Text as="h1" size="display">
        {title}
      </Text>
      {description ? (
        <Text as="p" size="lg" tone="muted" className="max-w-xl">
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}
