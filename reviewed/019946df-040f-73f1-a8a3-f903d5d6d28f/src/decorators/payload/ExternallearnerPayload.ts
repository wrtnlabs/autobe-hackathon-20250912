import { tags } from "typia";

export interface ExternallearnerPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "externallearner";
}
