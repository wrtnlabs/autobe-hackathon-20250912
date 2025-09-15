import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformConfiguration";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new configuration record in the healthcare_platform_configuration
 * table.
 *
 * This endpoint allows a system administrator to create a new operational or
 * technical configuration record for either the platform (global scope) or for
 * a specific organization. It enforces uniqueness of the key within the
 * organization context and records timestamps for auditability. Created
 * configurations can later be soft-deleted or updated. No clinical or PHI data
 * should be stored here.
 *
 * @param props - The configuration creation request properties
 * @param props.systemAdmin - The authenticated system administrator payload
 * @param props.body - The request body containing organization_id (optional),
 *   configuration key, value, and description
 * @returns The newly created configuration entity with all required and
 *   optional fields populated
 * @throws {Error} If a configuration with the same key already exists within
 *   the given organization context
 */
export async function posthealthcarePlatformSystemAdminConfiguration(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformConfiguration.ICreate;
}): Promise<IHealthcarePlatformConfiguration> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_configuration.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id ?? null,
          key: body.key,
          value: body.value,
          description: body.description,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      healthcare_platform_organization_id:
        created.healthcare_platform_organization_id ?? undefined,
      key: created.key,
      value: created.value,
      description: created.description,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new Error("Configuration key must be unique per organization.");
    }
    throw err;
  }
}
