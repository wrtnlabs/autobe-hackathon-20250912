import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific locale setting by its UUID from the
 * healthcare_platform_locale_settings table.
 *
 * Fetches a single, active (non-deleted) locale setting record by its unique
 * identifier. Ensures that the requesting organization admin has rights to
 * access the record (either global or in their organization). Converts all
 * date/datetime fields to branded ISO8601 strings, handles nullable/optional
 * fields as undefined where appropriate, and strictly enforces all
 * typing/branding rules.
 *
 * @param props - Parameters for the operation
 * @param props.organizationAdmin - Authenticated organization admin making this
 *   request (must be a valid organizationadmin)
 * @param props.localeSettingId - UUID of the locale setting to retrieve
 * @returns The detailed locale setting for administrative or configuration
 *   purposes
 * @throws {Error} If the requested record is not found or outside the admin's
 *   organizational scope
 */
export async function gethealthcarePlatformOrganizationAdminLocaleSettingsLocaleSettingId(props: {
  organizationAdmin: OrganizationadminPayload;
  localeSettingId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformLocaleSettings> {
  const { organizationAdmin, localeSettingId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        id: localeSettingId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("Locale setting not found or has been deleted");
  }
  if (
    record.healthcare_platform_organization_id !== null &&
    record.healthcare_platform_organization_id !== undefined &&
    record.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: You do not have access to this organization's locale setting",
    );
  }
  return {
    id: record.id,
    healthcare_platform_organization_id:
      record.healthcare_platform_organization_id ?? undefined,
    healthcare_platform_department_id:
      record.healthcare_platform_department_id ?? undefined,
    language: record.language,
    timezone: record.timezone,
    date_format: record.date_format,
    time_format: record.time_format,
    number_format: record.number_format,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
