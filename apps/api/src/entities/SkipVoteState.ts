import "reflect-metadata";

import { Field, ID, Int, ObjectType } from "type-graphql";

/**
 * Live skip tally for the room's current now-playing item.
 * Quorum is a simple majority of active participants (for now: all guests).
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

  /** Votes needed to pass: floor(n/2)+1 when n>0, else 0. */
  @Field(() => Int)
  threshold!: number;

  @Field(() => Boolean)
  passed!: boolean;

  /** Whether the requesting viewer currently has a skip vote. */
  @Field(() => Boolean)
  viewerHasVoted!: boolean;
}
