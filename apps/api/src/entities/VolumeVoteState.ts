import "reflect-metadata";

import { Field, ID, Int, ObjectType } from "type-graphql";
import {
  VolumeVoteDirection,
  VolumeVoteValue,
} from "./VolumeVote.js";

/**
 * Live volume-vote tally for the room's current now-playing item.
 * Quorum is floor(n/3)+1 of active guests (independent of skip majority).
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

  /** Votes needed to pass: floor(n/3)+1 when n>0, else 0. */
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
