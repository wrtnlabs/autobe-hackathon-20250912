import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new locale setting for an organization or department.
 *
 * This function allows an organization administrator to create a new locale
 * settings record for their organization or a specific department. Only one
 * active locale settings record is permitted per organization/department
 * combination. If an existing, non-deleted locale settings record exists for
 * the given organization and department, an error will be thrown. Organization
 * administrators may only create settings for their own organization, never for
 * other organizations. Timestamps and UUIDs are handled as branded ISO8601
 * strings, with no use of native Date or type assertions.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - The authenticated organization admin
 *   (organization ID is implied)
 * @param props.body - The locale settings data to create, including language,
 *   timezone, and formatting
 * @returns The newly created IHealthcarePlatformLocaleSettings record
 * @throws {Error} If locale settings already exist for the
 *   organization/department, or if organizationAdmin does not match the org
 */
export async function posthealthcarePlatformOrganizationAdminLocaleSettings(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformLocaleSettings.ICreate;
}): Promise<IHealthcarePlatformLocaleSettings> {
  const { organizationAdmin, body } = props;

  // Only allow creation for own organization
  const adminOrgId = organizationAdmin.id;
  if (
    body.healthcare_platform_organization_id !== undefined &&
    body.healthcare_platform_organization_id !== null &&
    body.healthcare_platform_organization_id !== adminOrgId
  ) {
    throw new Error(
      "Cannot create locale settings for a different organization.",
    );
  }

  // Uniqueness: no duplicate active settings for org+dept
  const exists =
    await MyGlobal.prisma.healthcare_platform_locale_settings.findFirst({
      where: {
        healthcare_platform_organization_id: adminOrgId,
        healthcare_platform_department_id:
          body.healthcare_platform_department_id ?? null,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new Error(
      "A locale setting already exists for this organization/department.",
    );
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_locale_settings.create({
      data: {
        id: v4(),
        healthcare_platform_organization_id: adminOrgId,
        healthcare_platform_department_id:
          body.healthcare_platform_department_id ?? null,
        language: body.language,
        timezone: body.timezone,
        date_format: body.date_format,
        time_format: body.time_format,
        number_format: body.number_format,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id ?? undefined,
    healthcare_platform_department_id:
      created.healthcare_platform_department_id ?? undefined,
    language: created.language,
    timezone: created.timezone,
    date_format: created.date_format,
    time_format: created.time_format,
    number_format: created.number_format,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
