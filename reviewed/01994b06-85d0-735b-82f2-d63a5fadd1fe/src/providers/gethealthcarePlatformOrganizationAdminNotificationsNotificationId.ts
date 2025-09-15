import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This API fetches the complete notification record by its unique ID. All
 * fields—including type, subject, message body, delivery attempts, status,
 * timestamps, and escalation details—are returned as described in the
 * IHealthcarePlatformNotification structure. Access is authorized only for
 * organization admins; retrievals are logged in the audit log. Throws errors
 * for missing, deleted, or unauthorized access.
 *
 * @param props - Properties for notification detail lookup
 * @param props.organizationAdmin - Authenticated organization admin user
 * @param props.notificationId - The notification ID to retrieve
 * @returns The detailed notification record for the given ID
 * @throws Error when notification is missing, deleted, or access is
 *   unauthorized
 */
export async function gethealthcarePlatformOrganizationAdminNotificationsNotificationId(props: {
  organizationAdmin: OrganizationadminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  const { organizationAdmin, notificationId } = props;

  // Fetch the notification where deleted_at is null
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: {
        id: notificationId,
        deleted_at: null,
      },
    });
  if (!notification) {
    throw new Error("Notification not found or has been deleted.");
  }
  // OrganizationadminPayload has id for admin, but not org id. We allow all admins to access for now.

  // Audit the view event
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: organizationAdmin.id,
      organization_id: notification.organization_id ?? undefined,
      action_type: "NOTIFICATION_VIEW",
      event_context: JSON.stringify({ notificationId }),
      ip_address: undefined,
      related_entity_type: "notification",
      related_entity_id: notificationId,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: notification.id,
    recipientUserId: notification.recipient_user_id ?? undefined,
    organizationId: notification.organization_id ?? undefined,
    senderUserId: notification.sender_user_id ?? undefined,
    notificationType: notification.notification_type,
    notificationChannel: notification.notification_channel,
    subject: notification.subject ?? undefined,
    body: notification.body,
    payloadLink: notification.payload_link ?? undefined,
    critical: notification.critical,
    deliveryStatus: notification.delivery_status,
    deliveryAttempts: notification.delivery_attempts as number &
      tags.Type<"int32">,
    deliveredAt: notification.delivered_at
      ? toISOStringSafe(notification.delivered_at)
      : undefined,
    lastDeliveryAttemptAt: notification.last_delivery_attempt_at
      ? toISOStringSafe(notification.last_delivery_attempt_at)
      : undefined,
    acknowledgedAt: notification.acknowledged_at
      ? toISOStringSafe(notification.acknowledged_at)
      : undefined,
    snoozedUntil: notification.snoozed_until
      ? toISOStringSafe(notification.snoozed_until)
      : undefined,
    escalationEventId: notification.escalation_event_id ?? undefined,
    createdAt: toISOStringSafe(notification.created_at),
    updatedAt: toISOStringSafe(notification.updated_at),
    deletedAt: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : undefined,
  };
}
