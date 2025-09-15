import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This endpoint fetches the full record of a notification event by its unique
 * notificationId for a receptionist. The operation enforces strict row-level
 * access control: only the recipient (receptionist) is permitted to retrieve
 * full content. It returns all notification details, including subject, body,
 * status, delivery attempts, timestamps, and escalation/acknowledgement data as
 * per schema. All date/datetime fields are converted to string &
 * tags.Format<'date-time'> and all optional nullable fields are mapped to
 * undefined when absent.
 *
 * @param props - Operation parameters.
 * @param props.receptionist - Authenticated receptionist making the request.
 * @param props.notificationId - Unique identifier of the notification to
 *   retrieve.
 * @returns IHealthcarePlatformNotification record if found and authorized.
 * @throws {Error} If the notification is not found, deleted, or if the
 *   requester does not match the recipient.
 */
export async function gethealthcarePlatformReceptionistNotificationsNotificationId(props: {
  receptionist: ReceptionistPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  const { receptionist, notificationId } = props;
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: {
        id: notificationId,
        deleted_at: null,
      },
    });
  if (!notification) {
    throw new Error("Notification not found");
  }
  if (notification.recipient_user_id !== receptionist.id) {
    throw new Error(
      "Access denied: Only the recipient may view this notification.",
    );
  }
  return {
    id: notification.id,
    recipientUserId:
      notification.recipient_user_id === null
        ? undefined
        : notification.recipient_user_id,
    organizationId:
      notification.organization_id === null
        ? undefined
        : notification.organization_id,
    senderUserId:
      notification.sender_user_id === null
        ? undefined
        : notification.sender_user_id,
    notificationType: notification.notification_type,
    notificationChannel: notification.notification_channel,
    subject: notification.subject === null ? undefined : notification.subject,
    body: notification.body,
    payloadLink:
      notification.payload_link === null
        ? undefined
        : notification.payload_link,
    critical: notification.critical,
    deliveryStatus: notification.delivery_status,
    deliveryAttempts: notification.delivery_attempts,
    deliveredAt:
      notification.delivered_at === null
        ? undefined
        : toISOStringSafe(notification.delivered_at),
    lastDeliveryAttemptAt:
      notification.last_delivery_attempt_at === null
        ? undefined
        : toISOStringSafe(notification.last_delivery_attempt_at),
    acknowledgedAt:
      notification.acknowledged_at === null
        ? undefined
        : toISOStringSafe(notification.acknowledged_at),
    snoozedUntil:
      notification.snoozed_until === null
        ? undefined
        : toISOStringSafe(notification.snoozed_until),
    escalationEventId:
      notification.escalation_event_id === null
        ? undefined
        : notification.escalation_event_id,
    createdAt: toISOStringSafe(notification.created_at),
    updatedAt: toISOStringSafe(notification.updated_at),
    deletedAt:
      notification.deleted_at === null
        ? undefined
        : toISOStringSafe(notification.deleted_at),
  };
}
