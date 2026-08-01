import "reflect-metadata";

import { Field, ID, Int, ObjectType } from "type-graphql";
import {
  VolumeVoteDirection,
  VolumeVoteValue,
} from "./VolumeVote.js";

/**
 * Live volume-vote tally for the room's current now-playing item.
 * Quorum is ceil(n * volumeQuorumPercent / 100) of active guests.
 */
@ObjectType()
export class VolumeVoteState {
  @Field(() => ID)
  roomId!: string;

  /** Queue item currently playing (last soft-popped). Null when idle. */
  @Field(() => ID, { nullable: true })
  queueItemId!: string | null;

  @Field(() => Int)
  upCount!: number;

  @Field(() => Int)
  downCount!: number;

  /** upCount - downCount. */
  @Field(() => Int)
  netCount!: number;

  /** Active participants counted toward quorum (guests for now). */
  @Field(() => Int)
  participantCount!: number;

  /** Votes needed to pass from the room's volume quorum percent. */
  @Field(() => Int)
  threshold!: number;

  @Field(() => Boolean)
  passed!: boolean;

  /** Quorum direction when passed; null otherwise. */
  @Field(() => VolumeVoteDirection, { nullable: true })
  direction!: VolumeVoteDirection | null;

  /** Viewer's current choice (NONE when unset). */
  @Field(() => VolumeVoteValue)
  viewerVote!: VolumeVoteValue;
}
