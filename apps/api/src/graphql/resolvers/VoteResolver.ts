import { Arg, Ctx, ID, Mutation, Query, Resolver } from "type-graphql";
import { Vote, VoteValue } from "../../entities/Vote.js";
import { VotePayload } from "../../entities/VotePayload.js";
import type { GraphQLContext } from "../context.js";

@Resolver()
export class VoteResolver {
  @Query(() => [Vote])
  async myQueueVotes(
    @Arg("roomId", () => ID) roomId: string,
    @Arg("participantId", () => ID) participantId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<Vote[]> {
    return context.services.vote.listForParticipant(roomId, participantId);
  }

  @Mutation(() => VotePayload)
  async voteOnQueueItem(
    @Arg("participantId", () => ID) participantId: string,
    @Arg("queueItemId", () => ID) queueItemId: string,
    @Arg("value", () => VoteValue) value: VoteValue,
    @Ctx() context: GraphQLContext,
  ): Promise<VotePayload> {
    return context.services.vote.voteOnQueueItem({
      participantId,
      queueItemId,
      value,
    });
  }
}
