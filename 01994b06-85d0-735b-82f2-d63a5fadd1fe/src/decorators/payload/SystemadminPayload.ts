import { tags } from "typia";

/**
 * JWT Payload for Systemadmin authentication.
 *
 * - Id: Top-level systemadmin user table ID (UUID).
 * - Type: Discriminator for role.
 */
export interface SystemadminPayload {
  /**
   * Top-level healthcare_platform_systemadmins table ID (fundamental system
   * admin user identifier).
   */
  id: string & tags.Format<"uuid">;

  /** Discriminator for Systemadmin role payload. */
  type: "systemAdmin";
}
