import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new locale setting entry for an organization or department (system
 * admin only).
 *
 * This operation persists a new entry in the
 * healthcare_platform_locale_settings table, specifying localization
 * preferences for an organization or department. It enforces that only one
 * active (undeleted) locale setting exists for a given (organization_id,
 * department_id) pair. Creation is restricted to authorized system admin users.
 * Attempts to create a duplicate will result in an error. All required
 * configuration and timestamps are managed automatically.
 *
 * @param props - Parameters for locale settings creation
 * @param props.systemAdmin - The authenticated system admin initiating the
 *   creation
 * @param props.body - Locale settings configuration including org/department
 *   scope and formatting rules
 * @returns The newly created locale settings entity including its persisted
 *   UUID and all configuration attributes
 * @throws {Error} When an active locale setting already exists for the
 *   specified organization and department
 */
export async function posthealthcarePlatformSystemAdminLocaleSettings(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformLocaleSettings.ICreate;
}): Promise<IHealthcarePlatformLocaleSettings> {
  // Enforce at-most-one active locale settings for the org/department
  const existing =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        healthcare_platform_organization_id:
          props.body.healthcare_platform_organization_id ?? null,
        healthcare_platform_department_id:
          props.body.healthcare_platform_department_id ?? null,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error(
      "A locale setting for this organization/department combination already exists. Only one active locale setting is permitted per org/department.",
    );
  }

  const now = toISOStringSafe(new Date());
  const id = v4();
  const created =
    await MyGlobal.prisma.healthcare_platform_locale_settings.create({
      data: {
        id,
        healthcare_platform_organization_id:
          props.body.healthcare_platform_organization_id ?? null,
        healthcare_platform_department_id:
          props.body.healthcare_platform_department_id ?? null,
        language: props.body.language,
        timezone: props.body.timezone,
        date_format: props.body.date_format,
        time_format: props.body.time_format,
        number_format: props.body.number_format,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id ?? null,
    healthcare_platform_department_id:
      created.healthcare_platform_department_id ?? null,
    language: created.language,
    timezone: created.timezone,
    date_format: created.date_format,
    time_format: created.time_format,
    number_format: created.number_format,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
