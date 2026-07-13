import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Text } from "@/primitives/text";

type DeskPanelProps = ComponentProps<"section"> & {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function DeskPanel({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: DeskPanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-card/90",
        className,
      )}
      {...props}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <Text
            as="h2"
            size="sm"
            className="font-medium tracking-[0.16em] uppercase"
          >
            {title}
          </Text>
          {description ? (
            <Text as="p" size="sm" tone="muted" className="mt-0.5">
              {description}
            </Text>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
