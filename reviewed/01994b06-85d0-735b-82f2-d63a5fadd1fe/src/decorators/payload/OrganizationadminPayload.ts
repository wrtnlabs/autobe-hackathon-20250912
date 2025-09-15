import { tags } from "typia";

/**
 * Payload injected for organizationadmin authenticated user. id: Top-level user
 * table ID (from healthcare_platform_organizationadmins) type: always
 * "organizationadmin"
 */
export interface OrganizationadminPayload {
  /**
   * Top-level organization admin user id (UUID for
   * healthcare_platform_organizationadmins.id)
   */
  id: string & tags.Format<"uuid">;

  /** Discriminator for union. Always "organizationadmin" for this payload. */
  type: "organizationadmin";
}
