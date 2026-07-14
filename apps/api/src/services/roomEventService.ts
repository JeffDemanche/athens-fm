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
  return {
    async listByRoom(roomIdOrShortId: string): Promise<RoomEvent[]> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        return [];
      }
      return repo.findByRoomId(room.id);
    },

    async recordJoin(participant: Participant): Promise<RoomEvent> {
      const event = await repo.create({
        roomId: String(participant.roomId),
        participantId: participant.id,
        participantName: participant.name ?? null,
        participantRole: participant.role,
        type: RoomEventType.JOINED,
      });
      publishRoomEvent(String(participant.roomId), event);
      return event;
    },

    async recordLeave(participant: Participant): Promise<RoomEvent> {
      const event = await repo.create({
        roomId: String(participant.roomId),
        participantId: participant.id,
        participantName: participant.name ?? null,
        participantRole: participant.role,
        type: RoomEventType.LEFT,
      });
      publishRoomEvent(String(participant.roomId), event);
      return event;
    },
  };
}

export const roomEventService = createRoomEventService();
export type RoomEventService = ReturnType<typeof createRoomEventService>;
