import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a single configuration record by id
 * (healthcare_platform_configuration).
 *
 * Allows a platform/system admin or an authorized org admin to retrieve a
 * specific configuration setting by its unique ID. This is used for admin UI
 * detail screens, business logic injection, or compliance/audit workflows.
 *
 * Only system admins can access this endpoint. Non-existent or unauthorized IDs
 * result in an error. All access is audit-logged.
 *
 * @param props - Properties for configuration lookup
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.configurationId - The UUID of the configuration to fetch
 * @returns The IHealthcarePlatformConfiguration object with full detail
 * @throws {Error} When configuration does not exist or access is forbidden
 */
export async function gethealthcarePlatformSystemAdminConfigurationConfigurationId(props: {
  systemAdmin: SystemadminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformConfiguration> {
  const { configurationId } = props;
  const config =
    await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
      where: { id: configurationId },
    });
  if (!config) {
    throw new Error("Configuration not found");
  }
  return {
    id: config.id,
    healthcare_platform_organization_id:
      config.healthcare_platform_organization_id ?? undefined,
    key: config.key,
    value: config.value,
    description: config.description,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at:
      config.deleted_at !== null && config.deleted_at !== undefined
        ? toISOStringSafe(config.deleted_at)
        : undefined,
  };
}
