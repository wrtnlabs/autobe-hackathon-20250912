import { tags } from "typia";

export interface RegularuserPayload {
  /** Top-level user ID (primary key of recipe_sharing_regularusers). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the authenticated role type. */
  type: "regularuser";
}
