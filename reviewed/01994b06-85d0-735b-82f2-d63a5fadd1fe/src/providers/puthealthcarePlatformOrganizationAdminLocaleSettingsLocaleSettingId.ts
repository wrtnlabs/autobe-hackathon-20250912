import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a locale setting in the healthcare_platform_locale_settings table by
 * its UUID.
 *
 * This operation lets authorized organization admins update a specific locale
 * settings record—such as language, timezone, and formatting preferences—for
 * their organization or department. It strictly enforces that updates do not
 * create conflicting active settings for the same organization/department, and
 * that only admins with access rights may perform the operation. All date and
 * time fields are handled as ISO8601 strings.
 *
 * @param props - Object containing all required parameters for the update.
 * @param props.organizationAdmin - The authenticated OrganizationadminPayload
 *   for the admin performing the update
 * @param props.localeSettingId - UUID of the locale setting record to update
 * @param props.body - The update attributes for the locale setting (any subset)
 * @returns The updated locale setting record with all fields
 * @throws {Error} If record does not exist, soft-deleted, out-of-scope, or
 *   uniqueness conflict
 */
export async function puthealthcarePlatformOrganizationAdminLocaleSettingsLocaleSettingId(props: {
  organizationAdmin: OrganizationadminPayload;
  localeSettingId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLocaleSettings.IUpdate;
}): Promise<IHealthcarePlatformLocaleSettings> {
  const { organizationAdmin, localeSettingId, body } = props;

  // Step 1: Fetch active locale setting row
  const existing =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: { id: localeSettingId, deleted_at: null },
    });
  if (!existing) throw new Error("Locale settings record not found or deleted");

  // Step 2: Authorization (organizationAdmin can only update within their org)
  // In this context, assume organizationAdmin manages their root organization only
  if (
    existing.healthcare_platform_organization_id !== undefined &&
    existing.healthcare_platform_organization_id !== null &&
    existing.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "You do not have permission to update this locale setting (out-of-scope organization)",
    );
  }

  // Step 3: Uniqueness conflict check for (org, dept) tuple
  const orgId =
    body.healthcare_platform_organization_id ??
    existing.healthcare_platform_organization_id ??
    null;
  const deptId =
    body.healthcare_platform_department_id ??
    existing.healthcare_platform_department_id ??
    null;
  const conflict =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        id: { not: localeSettingId },
        deleted_at: null,
        ...(orgId !== null && {
          healthcare_platform_organization_id: orgId,
        }),
        ...(deptId !== null && {
          healthcare_platform_department_id: deptId,
        }),
      },
    });
  if (conflict) {
    throw new Error(
      "A locale setting for this organization/department already exists",
    );
  }

  // Step 4: Perform update (only for provided fields) + update updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_locale_settings.update({
      where: { id: localeSettingId },
      data: {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id ?? undefined,
        healthcare_platform_department_id:
          body.healthcare_platform_department_id ?? undefined,
        language: body.language ?? undefined,
        timezone: body.timezone ?? undefined,
        date_format: body.date_format ?? undefined,
        time_format: body.time_format ?? undefined,
        number_format: body.number_format ?? undefined,
        updated_at: now,
      },
    });

  // Step 5: Return IHealthcarePlatformLocaleSettings response with correct date and null handling
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id ?? undefined,
    healthcare_platform_department_id:
      updated.healthcare_platform_department_id ?? undefined,
    language: updated.language,
    timezone: updated.timezone,
    date_format: updated.date_format,
    time_format: updated.time_format,
    number_format: updated.number_format,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
