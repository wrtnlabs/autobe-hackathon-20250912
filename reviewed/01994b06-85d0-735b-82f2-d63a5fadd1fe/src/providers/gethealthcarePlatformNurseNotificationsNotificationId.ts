import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This endpoint fetches the complete record for a notification, enforcing that
 * only the intended nurse recipient can access the content. If the notification
 * does not exist, is deleted, or does not belong to the authenticated nurse, an
 * error is thrown. Date and uuid fields are handled as branded typia types.
 *
 * @param props - Function arguments
 * @param props.nurse - Authenticated nurse making the request
 * @param props.notificationId - UUID of the notification to retrieve
 * @returns The full notification details, if authorized
 * @throws {Error} If notification is not found, deleted, or access is denied
 */
export async function gethealthcarePlatformNurseNotificationsNotificationId(props: {
  nurse: NursePayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  const { nurse, notificationId } = props;
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: {
        id: notificationId,
        deleted_at: null,
        recipient_user_id: nurse.id,
      },
    });
  if (!notification) throw new Error("Notification not found or access denied");
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
    deliveryAttempts: notification.delivery_attempts,
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
