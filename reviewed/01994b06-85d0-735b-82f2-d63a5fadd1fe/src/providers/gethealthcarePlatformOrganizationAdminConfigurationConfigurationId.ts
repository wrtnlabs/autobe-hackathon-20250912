import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a single configuration record by id
 * (healthcare_platform_configuration).
 *
 * This operation allows a platform or organization admin to retrieve a specific
 * configuration setting by unique configuration ID. Only organization admins
 * assigned to the configuration's organization may access the record. The
 * endpoint enforces strict tenant boundary: configs must be both non-deleted
 * and belong to the admin's own organization. Fetching global or other-org
 * configs using this endpoint is denied. All date/datetime fields are returned
 * as ISO 8601 strings.
 *
 * @param props - Function arguments
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.configurationId - Configuration UUID to retrieve
 * @returns The detailed configuration record, matching
 *   IHealthcarePlatformConfiguration structure
 * @throws {Error} If config not found, soft-deleted, or inaccessible to the
 *   admin
 */
export async function gethealthcarePlatformOrganizationAdminConfigurationConfigurationId(props: {
  organizationAdmin: OrganizationadminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformConfiguration> {
  // Step 1: Find active org assignment for this org admin
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: props.organizationAdmin.id,
        deleted_at: null,
        assignment_status: "active",
      },
    });
  if (!assignment) {
    throw new Error(
      "No active organization assignment for organization admin.",
    );
  }

  // Step 2: Fetch the configuration with strict org scope and not soft-deleted
  const configuration =
    await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
      where: {
        id: props.configurationId,
        deleted_at: null,
        healthcare_platform_organization_id:
          assignment.healthcare_platform_organization_id,
      },
    });
  if (!configuration) {
    throw new Error(
      "Configuration not found or not accessible (wrong org, soft-deleted, or not present).",
    );
  }

  // Step 3: Return strict DTO, converting all datetimes using toISOStringSafe and mapping nullable fields as per the API type
  return {
    id: configuration.id,
    healthcare_platform_organization_id:
      configuration.healthcare_platform_organization_id ?? undefined,
    key: configuration.key,
    value: configuration.value,
    description: configuration.description,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
    deleted_at: configuration.deleted_at
      ? toISOStringSafe(configuration.deleted_at)
      : undefined,
  };
}
