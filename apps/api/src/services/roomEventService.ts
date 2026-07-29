import type { Participant } from "../entities/Participant.js";
import { RoomEventType, type RoomEvent } from "../entities/RoomEvent.js";
import { publishRoomEvent } from "../graphql/pubsub.js";
import {
  roomEventRepository,
  type RoomEventRepository,
} from "../repositories/roomEventRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";

export function createRoomEventService(
  repo: RoomEventRepository = roomEventRepository,
  rooms: RoomRepository = roomRepository,
) {
  async function record(
    participant: Participant,
    type: RoomEventType,
    detail?: string | null,
  ): Promise<RoomEvent> {
    const event = await repo.create({
      roomId: String(participant.roomId),
      participantId: participant.id,
      participantName: participant.name ?? null,
      participantRole: participant.role,
      type,
      detail: detail ?? null,
    });
    publishRoomEvent(String(participant.roomId), event);
    return event;
  }

  return {
    async listByRoom(roomIdOrShortId: string): Promise<RoomEvent[]> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        return [];
      }
      return repo.findByRoomId(room.id);
    },

    async recordJoin(participant: Participant): Promise<RoomEvent> {
      return record(participant, RoomEventType.JOINED);
    },

    async recordLeave(participant: Participant): Promise<RoomEvent> {
      return record(participant, RoomEventType.LEFT);
    },

    async recordItemSubmitted(
      participant: Participant,
      title: string,
    ): Promise<RoomEvent> {
      return record(participant, RoomEventType.ITEM_SUBMITTED, title);
    },

    async recordNowPlaying(
      participant: Participant,
      title: string,
    ): Promise<RoomEvent> {
      return record(participant, RoomEventType.NOW_PLAYING, title);
    },

    /**
     * Posts once per inactivity crossing. Overlapping sweep windows skip when
     * a BECAME_INACTIVE already exists at/after the guest's lastActiveAt.
     */
    async recordBecameInactive(
      participant: Participant,
    ): Promise<RoomEvent | null> {
      const since = participant.lastActiveAt ?? participant.createdAt;
      const alreadyRecorded = await repo.existsForParticipantSince({
        participantId: participant.id,
        type: RoomEventType.BECAME_INACTIVE,
        since,
      });
      if (alreadyRecorded) {
        return null;
      }
      return record(participant, RoomEventType.BECAME_INACTIVE);
    },
  };
}

export const roomEventService = createRoomEventService();
export type RoomEventService = ReturnType<typeof createRoomEventService>;
