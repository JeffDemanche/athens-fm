import { DeskPanel } from "@/composites/desk-panel";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  detail?: string;
  at: string;
};

type ActivityFeedProps = {
  className?: string;
  items?: ActivityItem[];
};

const PLACEHOLDER_ITEMS: ActivityItem[] = [
  {
    id: "1",
    actor: "Maya",
    action: "voted up",
    detail: "Midnight City",
    at: "just now",
  },
  {
    id: "2",
    actor: "Theo",
    action: "added to queue",
    detail: "Electric Feel",
    at: "1m ago",
  },
  {
    id: "3",
    actor: "Jun",
    action: "voted down",
    detail: "Blinding Lights",
    at: "3m ago",
  },
];

export function ActivityFeed({
  className,
  items = PLACEHOLDER_ITEMS,
}: ActivityFeedProps) {
  return (
    <DeskPanel
      title="Activity"
      description="Votes and queue moves from the room"
      className={cn(className)}
    >
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 py-8">
          <Text tone="muted" size="sm" className="text-center">
            Participant actions will show up here.
          </Text>
        </div>
      ) : (
        <ul className="h-full space-y-0 overflow-y-auto px-2 py-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-border/50 px-2 py-3 last:border-b-0"
            >
              <Text as="p" size="sm">
                <span className="font-medium">{item.actor}</span>{" "}
                <span className="text-muted-foreground">{item.action}</span>
                {item.detail ? (
                  <>
                    {" "}
                    <span className="font-medium">{item.detail}</span>
                  </>
                ) : null}
              </Text>
              <Text as="p" size="sm" tone="muted" className="mt-0.5 text-xs">
                {item.at}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </DeskPanel>
  );
}
