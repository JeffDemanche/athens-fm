import "reflect-metadata";

import { Field, ObjectType } from "type-graphql";
import { QueueItem } from "./QueueItem.js";
import { VoteValue } from "./Vote.js";

@ObjectType()
export class VotePayload {
  @Field(() => QueueItem)
  queueItem!: QueueItem;

  /** Null when the participant cleared their vote (toggled off). */
  @Field(() => VoteValue, { nullable: true })
  value!: VoteValue | null;
}
