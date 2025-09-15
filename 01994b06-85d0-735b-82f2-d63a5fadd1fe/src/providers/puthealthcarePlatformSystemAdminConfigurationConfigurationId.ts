import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a configuration record by UUID in the
 * healthcare_platform_configuration table.
 *
 * This operation updates an existing configuration entry (by UUID) for platform
 * or organization-scoped settings. The function ensures that only active
 * (non-deleted) records are updated, enforces uniqueness of configuration keys
 * within organizations, and returns a fully typed configuration object
 * including audit fields. Attempts to update with a key/org combination that
 * already exists elsewhere will result in an error. Audit fields (updated_at)
 * are refreshed on every update. Only fields present in the update body are
 * modified. No PHI or clinical content may be stored via this route.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.configurationId - UUID of the configuration setting to update
 * @param props.body - Partial update payload: key, value, description, or
 *   deleted_at (ISO8601 or null)
 * @returns The updated configuration entity with latest fields and audit
 *   metadata
 * @throws {Error} If configuration does not exist, is soft-deleted, or if
 *   uniqueness constraint is violated by update
 */
export async function puthealthcarePlatformSystemAdminConfigurationConfigurationId(props: {
  systemAdmin: SystemadminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformConfiguration.IUpdate;
}): Promise<IHealthcarePlatformConfiguration> {
  const { configurationId, body } = props;

  // 1. Find configuration by ID, only if not soft-deleted
  const existing =
    await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
      where: { id: configurationId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Configuration not found or is deleted");
  }

  // 2. Enforce uniqueness of [key, org] if key is changing
  if (body.key !== undefined && body.key !== existing.key) {
    const conflict =
      await MyGlobal.prisma.healthcare_platform_configuration.findFirst({
        where: {
          key: body.key,
          healthcare_platform_organization_id:
            existing.healthcare_platform_organization_id,
          id: { not: configurationId },
          deleted_at: null,
        },
      });
    if (conflict) {
      throw new Error("Duplicate configuration key for this organization.");
    }
  }

  // 3. Prepare update data using only explicitly defined body fields
  const updateData: {
    key?: string;
    value?: string;
    description?: string;
    deleted_at?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.key !== undefined && { key: body.key }),
    ...(body.value !== undefined && { value: body.value }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.deleted_at !== undefined && {
      deleted_at: body.deleted_at === null ? null : body.deleted_at,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // 4. Execute update
  const updated =
    await MyGlobal.prisma.healthcare_platform_configuration.update({
      where: { id: configurationId },
      data: updateData,
    });

  // 5. Return result in shape of IHealthcarePlatformConfiguration
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id ?? undefined,
    key: updated.key,
    value: updated.value,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
