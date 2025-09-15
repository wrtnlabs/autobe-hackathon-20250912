import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This API endpoint fetches the full record of a notification event by its
 * unique notificationId. Drawing on the Notifications schema, it returns
 * detailed data including notification type, channel, criticality, recipient,
 * sender, subject, full body, delivery attempts and status, time stamps, and
 * any escalation or acknowledgement data linked to the notification.
 *
 * Only the intended recipient department head can view the full notification
 * detail. If the notification does not exist or the user is not the recipient,
 * an error is thrown. All access should be logged for audit purposes by other
 * infrastructure.
 *
 * @param props - Request properties
 * @param props.departmentHead - The authenticated department head user
 * @param props.notificationId - The unique identifier of the notification to
 *   retrieve
 * @returns The full detailed notification record, if authorized
 * @throws {Error} When the notification does not exist, is already deleted, or
 *   the requester is not the recipient
 */
export async function gethealthcarePlatformDepartmentHeadNotificationsNotificationId(props: {
  departmentHead: DepartmentheadPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
    });
  if (!notification) {
    throw new Error("Notification not found");
  }
  if (notification.recipient_user_id !== props.departmentHead.id) {
    throw new Error("Forbidden: Only the recipient may view this notification");
  }
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
