import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete a calendar setting record in the
 * healthcare_platform_calendar_settings table.
 *
 * This endpoint allows an organization administrator to soft-delete a calendar
 * setting by marking the deleted_at field with the current timestamp. The
 * deleted setting is retained for compliance but will not be used in future
 * scheduling or organization workflows. Only authenticated and authorized
 * organization administrators of the owning organization may delete the
 * calendar setting. All soft-delete events are recorded in the audit log for
 * compliance purposes.
 *
 * @param props - Properties for the operation
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the operation
 * @param props.calendarSettingId - The unique identifier of the calendar
 *   setting to soft-delete
 * @returns Void
 * @throws {Error} If the calendar setting does not exist, is already deleted,
 *   or if the administrator is not authorized to manage the organization
 */
export async function deletehealthcarePlatformOrganizationAdminCalendarSettingsCalendarSettingId(props: {
  organizationAdmin: OrganizationadminPayload;
  calendarSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, calendarSettingId } = props;

  // Fetch the targeted calendar setting, ensure it exists and is not already deleted.
  const setting =
    await MyGlobal.prisma.healthcare_platform_calendar_settings.findUnique({
      where: { id: calendarSettingId },
    });
  if (!setting) {
    throw new Error("Calendar setting not found");
  }
  if (setting.deleted_at !== null) {
    throw new Error("Calendar setting is already deleted");
  }

  // Verify the admin user is actively assigned to this organization.
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          setting.healthcare_platform_organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new Error(
      "Forbidden: Administrator is not assigned to manage this organization",
    );
  }

  // Prepare soft-delete timestamp (all in string & tags.Format<'date-time'>)
  const timestamp = toISOStringSafe(new Date());

  // Perform the soft-delete update
  await MyGlobal.prisma.healthcare_platform_calendar_settings.update({
    where: { id: calendarSettingId },
    data: { deleted_at: timestamp },
  });

  // Audit log record for the deletion event
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: setting.healthcare_platform_organization_id,
      action_type: "CALENDAR_SETTING_SOFT_DELETE",
      related_entity_type: "calendar_setting",
      related_entity_id: calendarSettingId,
      created_at: timestamp,
    },
  });
}
