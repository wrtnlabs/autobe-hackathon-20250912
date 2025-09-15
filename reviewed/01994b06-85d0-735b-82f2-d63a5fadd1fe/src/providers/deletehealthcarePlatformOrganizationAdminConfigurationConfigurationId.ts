import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete a configuration record by UUID, using the deleted_at field for
 * compliance.
 *
 * This operation performs a soft deletion of an existing configuration record
 * in the healthcare_platform_configuration table by setting the deleted_at
 * timestamp. The record is preserved for audit, rollback, and compliance
 * purposes, rather than being removed. Only active (not already deleted)
 * configurations are eligible. The deletion is restricted to organization-level
 * administrators for their own organization's configs.
 *
 * @param props - Properties for this operation
 * @param props.organizationAdmin - Authenticated organization admin performing
 *   the operation
 * @param props.configurationId - UUID of the configuration to be soft-deleted
 * @returns Void
 * @throws {Error} If not found, already deleted, or unauthorized
 */
export async function deletehealthcarePlatformOrganizationAdminConfigurationConfigurationId(props: {
  organizationAdmin: OrganizationadminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, configurationId } = props;

  // Find config record (active only)
  const config =
    await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
      where: {
        id: configurationId,
        deleted_at: null,
      },
    });
  if (config === null) {
    throw new Error("Configuration not found or already deleted");
  }

  // Ensure org admin only deletes configs tied to their own organization (if config is org-scoped)
  if (
    config.healthcare_platform_organization_id !== undefined &&
    config.healthcare_platform_organization_id !== null &&
    config.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: Admin cannot delete configuration for another organization",
    );
  }

  // Perform soft delete (set deleted_at to now)
  await MyGlobal.prisma.healthcare_platform_configuration.update({
    where: { id: configurationId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
