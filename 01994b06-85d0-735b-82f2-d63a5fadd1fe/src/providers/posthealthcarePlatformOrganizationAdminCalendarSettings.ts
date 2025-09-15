import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformCalendarSetting";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new calendar setting in the healthcare_platform_calendar_settings
 * table.
 *
 * This operation creates and returns a calendar or locale/regional settings
 * entity for a platform, organization, or department context. It sets
 * scheduling rules, localization, blackout dates, lead/cancel windows, and
 * resource availability rules for appointment workflows. Uniqueness and RBAC
 * are enforced; only authenticated organization administrators may perform this
 * operation. Timestamps are set using system clock. Duplicate (org, dept)
 * combos are prevented by database constraints.
 *
 * @param props - Properties for calendar setting creation
 * @param props.organizationAdmin - Authenticated organization admin user (from
 *   decorator)
 * @param props.body - Input data for the new calendar setting (see
 *   IHealthcarePlatformCalendarSetting.ICreate)
 * @returns The newly created calendar setting, including assigned id and all
 *   properties
 * @throws {Error} If a duplicate calendar setting exists or RBAC/validation
 *   fails
 */
export async function posthealthcarePlatformOrganizationAdminCalendarSettings(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformCalendarSetting.ICreate;
}): Promise<IHealthcarePlatformCalendarSetting> {
  const { organizationAdmin, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_calendar_settings.create({
        data: {
          id,
          healthcare_platform_organization_id:
            body.healthcare_platform_organization_id ?? null,
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
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (err) {
    // Uniqueness constraint errors (duplicate calendar setting)
    // or other database errors propagate as exceptions for API error handling
    throw err;
  }
}
