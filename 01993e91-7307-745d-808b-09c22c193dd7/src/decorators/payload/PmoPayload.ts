import { tags } from "typia";

export interface PmoPayload {
  /** Top-level user table ID (fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the role type. */
  type: "pmo";
}
