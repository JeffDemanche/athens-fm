import "reflect-metadata";

import { Field, InputType, Int } from "type-graphql";

@InputType()
export class RoomSettingsInput {
  @Field(() => Int)
  skipQuorumPercent!: number;

  @Field(() => Int)
  volumeQuorumPercent!: number;

  /** Null disables the duration cap. */
  @Field(() => Int, { nullable: true })
  maxSubmissionDurationMinutes!: number | null;

  /** Null disables the simultaneous-submission cap. */
  @Field(() => Int, { nullable: true })
  maxSimultaneousSubmissions!: number | null;
}
