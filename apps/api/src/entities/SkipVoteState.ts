import "reflect-metadata";

import { Field, ID, Int, ObjectType } from "type-graphql";

/**
 * Live skip tally for the room's current now-playing item.
 * Quorum is ceil(n * skipQuorumPercent / 100) of active guests.
 */
@ObjectType()
export class SkipVoteState {
  @Field(() => ID)
  roomId!: string;

  /** Queue item currently playing (last soft-popped). Null when idle. */
  @Field(() => ID, { nullable: true })
  queueItemId!: string | null;

  @Field(() => Int)
  voteCount!: number;

  /** Active participants counted toward quorum (guests for now). */
  @Field(() => Int)
  participantCount!: number;

  /** Votes needed to pass from the room's skip quorum percent. */
  @Field(() => Int)
  threshold!: number;

  @Field(() => Boolean)
  passed!: boolean;

  /** Whether the requesting viewer currently has a skip vote. */
  @Field(() => Boolean)
  viewerHasVoted!: boolean;
}
