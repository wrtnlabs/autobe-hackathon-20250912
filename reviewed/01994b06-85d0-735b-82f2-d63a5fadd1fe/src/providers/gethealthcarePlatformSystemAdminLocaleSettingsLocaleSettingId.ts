import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a specific locale setting by its UUID from the
 * healthcare_platform_locale_settings table.
 *
 * This endpoint fetches detailed information about a locale settings record by
 * its unique identifier. Locale settings define language, timezone, formatting,
 * and regionalization for the platform, organization, or department. Only
 * active (not soft-deleted) locale settings are returned; access is permitted
 * only to authenticated system administrators.
 *
 * Authorization and audit trail logic is handled at the route/controller level.
 * If the locale setting is not found, deleted, or outside of authorized scope,
 * an error is thrown.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - The authenticated SystemadminPayload making the
 *   request
 * @param props.localeSettingId - The UUID of the locale settings record to
 *   retrieve
 * @returns Detailed IHealthcarePlatformLocaleSettings record if found and
 *   active
 * @throws {Error} If the locale setting is not found, deleted, or unauthorized
 */
export async function gethealthcarePlatformSystemAdminLocaleSettingsLocaleSettingId(props: {
  systemAdmin: SystemadminPayload;
  localeSettingId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLocaleSettings> {
  const record =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        id: props.localeSettingId,
        deleted_at: null,
      },
    });
  if (record == null) {
    throw new Error("Locale setting not found");
  }
  return {
    id: record.id,
    healthcare_platform_organization_id:
      record.healthcare_platform_organization_id === null
        ? null
        : record.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      record.healthcare_platform_department_id === null
        ? null
        : record.healthcare_platform_department_id,
    language: record.language,
    timezone: record.timezone,
    date_format: record.date_format,
    time_format: record.time_format,
    number_format: record.number_format,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
