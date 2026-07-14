export type MembershipRole = "HOST" | "GUEST";

export type ActiveMembership = {
  participantId: string;
  roomId: string;
  roomShortId: string;
  role: MembershipRole;
};

const STORAGE_KEY = "athens-fm.active-membership";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getActiveMembership(): ActiveMembership | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ActiveMembership>;
    if (
      typeof parsed.participantId !== "string" ||
      typeof parsed.roomId !== "string" ||
      typeof parsed.roomShortId !== "string" ||
      (parsed.role !== "HOST" && parsed.role !== "GUEST")
    ) {
      return null;
    }

    return {
      participantId: parsed.participantId,
      roomId: parsed.roomId,
      roomShortId: parsed.roomShortId,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function setActiveMembership(membership: ActiveMembership): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(membership));
}

export function clearActiveMembership(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function isInAnotherRoom(
  membership: ActiveMembership | null,
  roomShortId: string,
): boolean {
  if (!membership) {
    return false;
  }

  return membership.roomShortId.toUpperCase() !== roomShortId.toUpperCase();
}
