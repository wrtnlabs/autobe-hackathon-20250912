import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a configuration record by UUID in the
 * healthcare_platform_configuration table.
 *
 * This operation allows an authenticated organization admin to update the key,
 * value, or description of a configuration scoped to their organization. The
 * update only applies to active (not soft-deleted) configurations and enforces
 * uniqueness of key+organization assignments. The response returns the updated
 * configuration with audit timestamps. Business logic ensures admins may only
 * update configs in their org (via assignment) and does not permit modification
 * of configs from other orgs. Attempts to update a deleted config or violate
 * key uniqueness will result in an error.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - Authenticated admin
 *   (OrganizationadminPayload, must be assigned to org)
 * @param props.configurationId - UUID of the configuration record to update
 * @param props.body - Partial payload for updating the configuration record
 * @returns The updated configuration record as
 *   IHealthcarePlatformConfiguration, with audit fields
 * @throws {Error} If configuration not found, soft deleted, forbidden, or
 *   uniqueness violation
 */
export async function puthealthcarePlatformOrganizationAdminConfigurationConfigurationId(props: {
  organizationAdmin: OrganizationadminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformConfiguration.IUpdate;
}): Promise<IHealthcarePlatformConfiguration> {
  const { organizationAdmin, configurationId, body } = props;

  // Fetch the target configuration (must not be soft-deleted)
  const config =
    await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
      where: {
        id: configurationId,
        deleted_at: null,
      },
    });
  if (!config) {
    throw new Error("Configuration not found or already deleted");
  }

  // Confirm org admin assignment to this org (else forbidden)
  if (!config.healthcare_platform_organization_id) {
    throw new Error(
      "Config is global; only system admins may update global configs",
    );
  }
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          config.healthcare_platform_organization_id,
      },
    });
  if (!assignment) {
    throw new Error("Forbidden: You are not assigned to this organization");
  }

  // If changing key, ensure it stays unique within organization
  if (body.key !== undefined && body.key !== config.key) {
    const duplicate =
      await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
        where: {
          key: body.key,
          healthcare_platform_organization_id:
            config.healthcare_platform_organization_id,
          deleted_at: null,
        },
      });
    if (duplicate) {
      throw new Error(
        "Duplicate configuration key for this organization (violates uniqueness constraint)",
      );
    }
  }

  // Perform the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_configuration.update({
      where: { id: configurationId },
      data: {
        key: body.key ?? undefined,
        value: body.value ?? undefined,
        description: body.description ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return API response, strictly match null/undefined for DTO expectations
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id ?? undefined,
    key: updated.key,
    value: updated.value,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
