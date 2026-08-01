import {
  Arg,
  Ctx,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import { VolumeVoteState } from "../../entities/VolumeVoteState.js";
import { VolumeVoteValue } from "../../entities/VolumeVote.js";
import type { GraphQLContext } from "../context.js";
import { pubSub, VOLUME_VOTE_STATE_TOPIC } from "../pubsub.js";

function rehydrateVolumeVoteState(payload: VolumeVoteState): VolumeVoteState {
  return {
    roomId: String(payload.roomId),
    queueItemId: payload.queueItemId ? String(payload.queueItemId) : null,
    upCount: payload.upCount ?? 0,
    downCount: payload.downCount ?? 0,
    netCount: payload.netCount ?? 0,
    participantCount: payload.participantCount ?? 0,
    threshold: payload.threshold ?? 0,
    passed: Boolean(payload.passed),
    direction: payload.direction ?? null,
    viewerVote: payload.viewerVote ?? VolumeVoteValue.NONE,
  };
}

@Resolver()
export class VolumeVoteResolver {
  @Query(() => VolumeVoteState)
  async volumeVoteState(
    @Arg("roomId", () => ID) roomId: string,
    @Arg("participantId", () => ID, { nullable: true })
    participantId: string | null,
    @Ctx() context: GraphQLContext,
  ): Promise<VolumeVoteState> {
    return context.services.volumeVote.getState(roomId, participantId);
  }

  @Mutation(() => VolumeVoteState)
  async setVolumeVote(
    @Arg("participantId", () => ID) participantId: string,
    @Arg("value", () => VolumeVoteValue) value: VolumeVoteValue,
    @Ctx() context: GraphQLContext,
  ): Promise<VolumeVoteState> {
    return context.services.volumeVote.setVote(participantId, value);
  }

  @Mutation(() => VolumeVoteState)
  async acknowledgeVolumeNudge(
    @Arg("roomId", () => ID) roomId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<VolumeVoteState> {
    return context.services.volumeVote.acknowledgeNudge(roomId);
  }

  @Subscription(() => VolumeVoteState, {
    subscribe: async ({ args, context }) => {
      const room = await (context as GraphQLContext).services.room.getById(
        args.roomId as string,
      );
      if (!room) {
        throw new Error("Room not found");
      }
      return pubSub.subscribe(VOLUME_VOTE_STATE_TOPIC, room.id);
    },
  })
  volumeVoteStateUpdated(
    @Root() payload: VolumeVoteState,
    @Arg("roomId", () => ID) _roomId: string,
  ): VolumeVoteState {
    return rehydrateVolumeVoteState(payload);
  }
}
