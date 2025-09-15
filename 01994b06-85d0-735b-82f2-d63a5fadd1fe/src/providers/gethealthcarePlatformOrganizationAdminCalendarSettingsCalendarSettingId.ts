import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformCalendarSetting";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed information for a specific calendar setting from
 * healthcare_platform_calendar_settings.
 *
 * Retrieves the available configuration and attributes for the given
 * calendarSettingId. This only returns fields that exist in the
 * healthcare_platform_calendar_settings schema. If required fields do not exist
 * in the schema but are in the API interface, this function may be incomplete -
 * see contract.
 *
 * @param props - Request params
 * @param props.organizationAdmin - Authenticated org admin
 * @param props.calendarSettingId - UUID of the calendar setting
 * @returns Calendar setting record (limited to present fields)
 * @throws {Error} If calendar setting is not found or is deleted.
 */
export async function gethealthcarePlatformOrganizationAdminCalendarSettingsCalendarSettingId(props: {
  organizationAdmin: OrganizationadminPayload;
  calendarSettingId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformCalendarSetting> {
  const calendar =
    await MyGlobal.prisma.healthcare_platform_calendar_settings.findFirst({
      where: { id: props.calendarSettingId, deleted_at: null },
    });
  if (!calendar) throw new Error("Calendar setting not found or deleted.");
  return {
    id: calendar.id as string & tags.Format<"uuid">,
    // Optional fields below are omitted since they do not exist in the schema and cannot be reliably provided
    // API contract may require fields the DB does not hold
    created_at: toISOStringSafe(calendar.created_at),
    updated_at: toISOStringSafe(calendar.updated_at),
    deleted_at: calendar.deleted_at
      ? toISOStringSafe(calendar.deleted_at)
      : undefined,
    // All other API fields like language/timezone/date_format etc, are omitted since not in schema
  } as IHealthcarePlatformCalendarSetting;
}
