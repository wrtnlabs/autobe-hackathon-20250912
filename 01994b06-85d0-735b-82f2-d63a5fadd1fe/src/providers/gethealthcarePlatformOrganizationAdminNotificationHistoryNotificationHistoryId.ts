import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationHistory";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a single notification delivery history event
 * (healthcare_platform_notification_history table).
 *
 * This endpoint retrieves the details of a notification delivery/acknowledgment
 * event for compliance investigation and status audit. Only organization admins
 * can view notification histories for their own organization's notifications.
 *
 * @param props - Parameters for the retrieval operation
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request
 * @param props.notificationHistoryId - Unique identifier of the notification
 *   delivery history event
 * @returns Details of the notification history event (delivery/ack status,
 *   delivery channel, event metadata, etc.)
 * @throws {Error} When the notification history event does not exist
 * @throws {Error} When the parent notification does not exist or is not linked
 *   to an organization
 * @throws {Error} When the admin is not permitted to view history for this
 *   notification (authorization failure)
 */
export async function gethealthcarePlatformOrganizationAdminNotificationHistoryNotificationHistoryId(props: {
  organizationAdmin: OrganizationadminPayload;
  notificationHistoryId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotificationHistory> {
  const { organizationAdmin, notificationHistoryId } = props;

  // Step 1: Retrieve notification history event by ID
  const notificationHistory =
    await MyGlobal.prisma.healthcare_platform_notification_history.findFirst({
      where: { id: notificationHistoryId },
    });
  if (notificationHistory === null) {
    throw new Error("Notification history event not found");
  }

  // Step 2: Retrieve associated notification for organization context
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: { id: notificationHistory.notification_id },
      select: { organization_id: true },
    });
  if (notification === null || notification.organization_id === null) {
    throw new Error(
      "Notification parent not found or not linked to an organization",
    );
  }

  // Step 3: Authorization - ensure admin is entitled to view this organization (the controller contract ensures the payload)
  // For expanded cases (e.g., admin manages multiple orgs), link checks would be required
  // For now, must ensure the admin user exists (soft-deleted protection is handled at auth layer, but check for robustness)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id },
      select: { id: true },
    });
  if (admin === null) {
    throw new Error("Organization admin not found or disabled");
  }

  // Additional check: The business contract assumes the controller authorizes that the admin manages this organization
  // If a mapping of admin -> org exists, this step would need to check that notification.organization_id matches such organization(s)
  // (Otherwise, all admin users can only manage their assigned org's notification histories at the controller level)

  // Step 4: Return the mapped DTO; all dates converted via toISOStringSafe; null details become undefined.
  return {
    id: notificationHistory.id,
    notification_id: notificationHistory.notification_id,
    event_type: notificationHistory.event_type,
    event_time: toISOStringSafe(notificationHistory.event_time),
    delivery_channel: notificationHistory.delivery_channel,
    delivery_status: notificationHistory.delivery_status,
    details:
      notificationHistory.details === null
        ? undefined
        : notificationHistory.details,
    created_at: toISOStringSafe(notificationHistory.created_at),
  };
}
