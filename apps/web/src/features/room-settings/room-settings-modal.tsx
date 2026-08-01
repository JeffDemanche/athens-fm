import { useEffect, useId, useState, type FormEvent } from "react";
import { SettingsIcon } from "lucide-react";
import { useUpdateRoomSettings } from "@/features/room-settings/use-update-room-settings";
import type { RoomSettingsFields, RoomSettingsInput } from "@/graphql/rooms";
import { Button } from "@/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/primitives/dialog";
import { Input } from "@/primitives/input";
import { Label } from "@/primitives/label";
import { Text } from "@/primitives/text";

type RoomSettingsModalProps = {
  settings: RoomSettingsFields;
};

type FormState = {
  skipQuorumPercent: string;
  volumeQuorumPercent: string;
  durationEnabled: boolean;
  maxSubmissionDurationMinutes: string;
  simultaneousEnabled: boolean;
  maxSimultaneousSubmissions: string;
};

function toFormState(settings: RoomSettingsFields): FormState {
  return {
    skipQuorumPercent: String(settings.skipQuorumPercent),
    volumeQuorumPercent: String(settings.volumeQuorumPercent),
    durationEnabled: settings.maxSubmissionDurationMinutes !== null,
    maxSubmissionDurationMinutes:
      settings.maxSubmissionDurationMinutes !== null
        ? String(settings.maxSubmissionDurationMinutes)
        : "10",
    simultaneousEnabled: settings.maxSimultaneousSubmissions !== null,
    maxSimultaneousSubmissions:
      settings.maxSimultaneousSubmissions !== null
        ? String(settings.maxSimultaneousSubmissions)
        : "3",
  };
}

function parsePercent(raw: string, label: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error(`${label} must be a whole number from 1 to 100`);
  }
  return value;
}

function parseOptionalPositive(
  enabled: boolean,
  raw: string,
  label: string,
): number | null {
  if (!enabled) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive whole number`);
  }
  return value;
}

export function RoomSettingsModal({ settings }: RoomSettingsModalProps) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => toFormState(settings));
  const [localError, setLocalError] = useState<string | null>(null);
  const { updateRoomSettings, loading, errorMessage } = useUpdateRoomSettings();

  useEffect(() => {
    if (open) {
      setForm(toFormState(settings));
      setLocalError(null);
    }
  }, [open, settings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    let input: RoomSettingsInput;
    try {
      input = {
        skipQuorumPercent: parsePercent(
          form.skipQuorumPercent,
          "Skip quorum percent",
        ),
        volumeQuorumPercent: parsePercent(
          form.volumeQuorumPercent,
          "Volume voting quorum percent",
        ),
        maxSubmissionDurationMinutes: parseOptionalPositive(
          form.durationEnabled,
          form.maxSubmissionDurationMinutes,
          "Max submission duration",
        ),
        maxSimultaneousSubmissions: parseOptionalPositive(
          form.simultaneousEnabled,
          form.maxSimultaneousSubmissions,
          "Max simultaneous submissions",
        ),
      };
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Invalid settings");
      return;
    }

    try {
      await updateRoomSettings(input);
      setOpen(false);
    } catch {
      // Apollo error surfaced via errorMessage
    }
  }

  const displayError = localError ?? errorMessage;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <SettingsIcon />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room settings</DialogTitle>
          <DialogDescription>
            Tune skip and volume voting thresholds, plus guest submission limits.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} className="grid gap-5" onSubmit={handleSubmit}>
          <fieldset className="grid gap-2">
            <Label htmlFor={`${formId}-skip`}>Skip item quorum (%)</Label>
            <Input
              id={`${formId}-skip`}
              type="number"
              min={1}
              max={100}
              step={1}
              value={form.skipQuorumPercent}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  skipQuorumPercent: event.target.value,
                }));
              }}
            />
            <Text as="p" size="sm" tone="muted">
              Percent of active listeners required to skip the current track.
            </Text>
          </fieldset>

          <fieldset className="grid gap-2">
            <Label htmlFor={`${formId}-volume`}>Volume voting quorum (%)</Label>
            <Input
              id={`${formId}-volume`}
              type="number"
              min={1}
              max={100}
              step={1}
              value={form.volumeQuorumPercent}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  volumeQuorumPercent: event.target.value,
                }));
              }}
            />
            <Text as="p" size="sm" tone="muted">
              Percent of active listeners required for a volume up or down nudge.
            </Text>
          </fieldset>

          <fieldset className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${formId}-duration`}>
                Max submission duration (minutes)
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={form.durationEnabled}
                  onChange={(event) => {
                    setForm((prev) => ({
                      ...prev,
                      durationEnabled: event.target.checked,
                    }));
                  }}
                />
                Enabled
              </label>
            </div>
            <Input
              id={`${formId}-duration`}
              type="number"
              min={1}
              step={1}
              disabled={!form.durationEnabled}
              value={form.maxSubmissionDurationMinutes}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  maxSubmissionDurationMinutes: event.target.value,
                }));
              }}
            />
            <Text as="p" size="sm" tone="muted">
              Longer tracks are rejected from the participant submit form.
            </Text>
          </fieldset>

          <fieldset className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${formId}-simultaneous`}>
                Max simultaneous submissions
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={form.simultaneousEnabled}
                  onChange={(event) => {
                    setForm((prev) => ({
                      ...prev,
                      simultaneousEnabled: event.target.checked,
                    }));
                  }}
                />
                Enabled
              </label>
            </div>
            <Input
              id={`${formId}-simultaneous`}
              type="number"
              min={1}
              step={1}
              disabled={!form.simultaneousEnabled}
              value={form.maxSimultaneousSubmissions}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  maxSimultaneousSubmissions: event.target.value,
                }));
              }}
            />
            <Text as="p" size="sm" tone="muted">
              Guests cannot add more items while they already have this many in
              the queue.
            </Text>
          </fieldset>

          {displayError ? (
            <Text as="p" size="sm" className="text-destructive">
              {displayError}
            </Text>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={loading}>
            {loading ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
