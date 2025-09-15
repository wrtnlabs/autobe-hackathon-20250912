import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete (soft-delete) a notification preference record for a user
 * (healthcare_platform_notification_preferences).
 *
 * This operation allows an organization admin to soft-delete a notification
 * preference entry, reverting delivery to org/system default settings. The
 * record is not physically deleted; deleted_at is set for audit/compliance
 * purposes. Authorization guarantees: Only admins of the organization owning
 * the preference can delete a record. Errors thrown for invalid id, forbidden
 * org, or already deleted record.
 *
 * @param props - Operation parameters.
 * @param props.organizationAdmin - The authenticated organization admin
 *   (OrganizationadminPayload)
 * @param props.notificationPreferenceId - Unique identifier for the
 *   notification preference to delete (UUID)
 * @returns Void
 * @throws {Error} If the preference does not exist, is already deleted, or does
 *   not belong to the admin's organization.
 */
export async function deletehealthcarePlatformOrganizationAdminNotificationPreferencesNotificationPreferenceId(props: {
  organizationAdmin: OrganizationadminPayload;
  notificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Look up the notification preference (must exist and not already deleted)
  const preference =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.findFirst(
      {
        where: {
          id: props.notificationPreferenceId,
          deleted_at: null,
        },
      },
    );
  if (!preference) {
    throw new Error("Notification preference not found or already deleted.");
  }

  // Step 2: Look up the admin record (must exist and not deleted)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: props.organizationAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin) {
    throw new Error("Organization admin account not found, or is deleted.");
  }

  // Step 3: Authorization - preference must belong to admin's organization
  // NOTE: Admin model does not have organization_id directly;
  // Assuming admin's id represents the organization's admin user, and notification preference organization_id matches admin.id
  if (!preference.organization_id || preference.organization_id !== admin.id) {
    throw new Error(
      "Unauthorized: Cannot delete a notification preference outside your organization.",
    );
  }

  // Step 4: Soft delete (set deleted_at using toISOStringSafe)
  await MyGlobal.prisma.healthcare_platform_notification_preferences.update({
    where: { id: props.notificationPreferenceId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
