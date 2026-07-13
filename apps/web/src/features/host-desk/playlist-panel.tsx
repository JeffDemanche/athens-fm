import { DeskPanel } from "@/composites/desk-panel";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

export type PlaylistTrack = {
  id: string;
  title: string;
  artist: string;
  durationLabel: string;
};

type PlaylistPanelProps = {
  className?: string;
  tracks?: PlaylistTrack[];
};

const PLACEHOLDER_TRACKS: PlaylistTrack[] = [
  {
    id: "1",
    title: "Electric Feel",
    artist: "MGMT",
    durationLabel: "3:49",
  },
  {
    id: "2",
    title: "Midnight City",
    artist: "M83",
    durationLabel: "4:04",
  },
  {
    id: "3",
    title: "Blinding Lights",
    artist: "The Weeknd",
    durationLabel: "3:20",
  },
  {
    id: "4",
    title: "Do I Wanna Know?",
    artist: "Arctic Monkeys",
    durationLabel: "4:32",
  },
  {
    id: "5",
    title: "Time to Pretend",
    artist: "MGMT",
    durationLabel: "4:21",
  },
];

export function PlaylistPanel({
  className,
  tracks = PLACEHOLDER_TRACKS,
}: PlaylistPanelProps) {
  return (
    <DeskPanel
      title="Playlist"
      description="Upcoming videos in play order"
      className={cn("shrink-0", className)}
    >
      {tracks.length === 0 ? (
        <div className="flex items-center justify-center px-4 py-8">
          <Text tone="muted" size="sm">
            Queue tracks will line up here.
          </Text>
        </div>
      ) : (
        <ol className="flex gap-3 overflow-x-auto px-4 py-3">
          {tracks.map((track, index) => (
            <li
              key={track.id}
              className="flex w-48 shrink-0 flex-col gap-2 rounded-md border border-border/70 bg-background/80 p-3"
            >
              <div className="flex aspect-video items-end rounded bg-[linear-gradient(145deg,_oklch(0.78_0.04_70),_oklch(0.55_0.06_25))] p-2">
                <Text
                  size="sm"
                  className="font-mono text-xs text-primary-foreground/90"
                >
                  #{index + 1}
                </Text>
              </div>
              <div className="min-w-0">
                <Text as="p" size="sm" className="truncate font-medium">
                  {track.title}
                </Text>
                <Text as="p" size="sm" tone="muted" className="truncate text-xs">
                  {track.artist} · {track.durationLabel}
                </Text>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DeskPanel>
  );
}
