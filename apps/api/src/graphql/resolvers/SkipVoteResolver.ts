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
import { SkipVoteState } from "../../entities/SkipVoteState.js";
import type { GraphQLContext } from "../context.js";
import { pubSub, SKIP_VOTE_STATE_TOPIC } from "../pubsub.js";

function rehydrateSkipVoteState(payload: SkipVoteState): SkipVoteState {
  return {
    roomId: String(payload.roomId),
    queueItemId: payload.queueItemId ? String(payload.queueItemId) : null,
    voteCount: payload.voteCount ?? 0,
    participantCount: payload.participantCount ?? 0,
    threshold: payload.threshold ?? 0,
    passed: Boolean(payload.passed),
    viewerHasVoted: Boolean(payload.viewerHasVoted),
  };
}

@Resolver()
export class SkipVoteResolver {
  @Query(() => SkipVoteState)
  async skipVoteState(
    @Arg("roomId", () => ID) roomId: string,
    @Arg("participantId", () => ID, { nullable: true })
    participantId: string | null,
    @Ctx() context: GraphQLContext,
  ): Promise<SkipVoteState> {
    return context.services.skipVote.getState(roomId, participantId);
  }

  @Mutation(() => SkipVoteState)
  async toggleSkipVote(
    @Arg("participantId", () => ID) participantId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<SkipVoteState> {
    return context.services.skipVote.toggle(participantId);
  }

  @Mutation(() => SkipVoteState)
  async clearNowPlaying(
    @Arg("roomId", () => ID) roomId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<SkipVoteState> {
    const state = await context.services.skipVote.clearNowPlaying(roomId);
    await context.services.volumeVote.clearVotesForRoom(roomId);
    return state;
  }

  @Subscription(() => SkipVoteState, {
    subscribe: async ({ args, context }) => {
      const room = await (context as GraphQLContext).services.room.getById(
        args.roomId as string,
      );
      if (!room) {
        throw new Error("Room not found");
      }
      return pubSub.subscribe(SKIP_VOTE_STATE_TOPIC, room.id);
    },
  })
  skipVoteStateUpdated(
    @Root() payload: SkipVoteState,
    @Arg("roomId", () => ID) _roomId: string,
  ): SkipVoteState {
    return rehydrateSkipVoteState(payload);
  }
}
