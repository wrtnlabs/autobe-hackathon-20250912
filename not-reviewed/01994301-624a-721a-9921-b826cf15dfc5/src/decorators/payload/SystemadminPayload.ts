import { tags } from "typia";

/**
 * JWT payload for an authenticated systemadmin user.
 *
 * - Id: Top-level systemadmin UUID (ats_recruitment_systemadmins.id)
 * - Type: Must always be "systemadmin"
 */
export interface SystemadminPayload {
  /**
   * Top-level user table ID (systemadmin UUID,
   * ats_recruitment_systemadmins.id).
   */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the systemadmin role. */
  type: "systemadmin";
}
