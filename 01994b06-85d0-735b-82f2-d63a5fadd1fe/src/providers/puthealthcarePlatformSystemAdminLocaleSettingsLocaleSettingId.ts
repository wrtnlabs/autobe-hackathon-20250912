import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a locale setting in the healthcare_platform_locale_settings table by
 * its UUID.
 *
 * Allows an authenticated system admin to update localization settings for a
 * given organization or department. Ensures that only one active (not
 * soft-deleted) locale setting exists per org/department context, preventing
 * duplicates/conflicts. Validates existence and non-deleted status before
 * update. Fails if another active locale setting for the same context exists
 * (other than this one). All date fields are returned as ISO8601 strings, never
 * as native Date objects.
 *
 * @param props - Properties for the update operation:
 *
 *   - SystemAdmin: The authenticated SystemadminPayload (authorization handled
 *       upstream)
 *   - LocaleSettingId: UUID of the locale setting record to update
 *   - Body: Fields to update (may include any subset allowed in the DTO)
 *
 * @returns The updated locale settings record with all attributes populated
 * @throws {Error} If the record does not exist, is deleted, or a duplicate
 *   context exists
 */
export async function puthealthcarePlatformSystemAdminLocaleSettingsLocaleSettingId(props: {
  systemAdmin: SystemadminPayload;
  localeSettingId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLocaleSettings.IUpdate;
}): Promise<IHealthcarePlatformLocaleSettings> {
  const { localeSettingId, body } = props;
  // 1. Ensure record exists and is not soft-deleted
  const existing =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        id: localeSettingId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error("Locale setting not found or has been deleted.");
  }
  // 2. Compute intended organization/department context for duplication check
  const contextOrgId =
    body.healthcare_platform_organization_id !== undefined
      ? body.healthcare_platform_organization_id
      : existing.healthcare_platform_organization_id;
  const contextDeptId =
    body.healthcare_platform_department_id !== undefined
      ? body.healthcare_platform_department_id
      : existing.healthcare_platform_department_id;
  // 3. Check that no other active locale setting exists for this context (conflict)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        id: { not: localeSettingId },
        deleted_at: null,
        healthcare_platform_organization_id: contextOrgId,
        healthcare_platform_department_id: contextDeptId,
      },
    });
  if (duplicate) {
    throw new Error(
      "A locale setting for this organization/department already exists.",
    );
  }
  // 4. Prepare update input: map only fields present in the request body; skip unchanged
  // (note: null values are valid and propagated)
  const updateInput = {
    healthcare_platform_organization_id:
      body.healthcare_platform_organization_id ?? undefined,
    healthcare_platform_department_id:
      body.healthcare_platform_department_id ?? undefined,
    language: body.language ?? undefined,
    timezone: body.timezone ?? undefined,
    date_format: body.date_format ?? undefined,
    time_format: body.time_format ?? undefined,
    number_format: body.number_format ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  };
  const updated =
    await MyGlobal.prisma.healthcare_platform_locale_settings.update({
      where: { id: localeSettingId },
      data: updateInput,
    });
  // 5. Return DTO-compliant response (ISO date strings)
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id ?? null,
    healthcare_platform_department_id:
      updated.healthcare_platform_department_id ?? null,
    language: updated.language,
    timezone: updated.timezone,
    date_format: updated.date_format,
    time_format: updated.time_format,
    number_format: updated.number_format,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
