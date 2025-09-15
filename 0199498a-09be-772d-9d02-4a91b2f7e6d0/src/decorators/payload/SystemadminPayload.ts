import { tags } from "typia";

/**
 * JWT payload for system admin authorization.
 *
 * - Id: System admin's unique ID (storyfield_ai_systemadmins.id, UUID)
 * - Type: Always "systemAdmin"
 */
export interface SystemadminPayload {
  /** Unique system admin ID (top-level user identifier for admins). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for system admin role. */
  type: "systemAdmin";
}
