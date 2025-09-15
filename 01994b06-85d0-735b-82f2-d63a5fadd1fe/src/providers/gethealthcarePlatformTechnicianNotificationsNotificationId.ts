import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This function retrieves the full details for a single notification by its
 * unique identifier from the Notifications table. It enforces access control:
 * only the technician who is the recipient of the notification may retrieve its
 * content. All access attempts are auditable and failure cases are handled
 * securely to avoid leaking data.
 *
 * @param props - The request parameters including:
 *
 *   - Technician: The authenticated technician user payload
 *   - NotificationId: The UUID of the notification to retrieve
 *
 * @returns The detailed IHealthcarePlatformNotification record
 * @throws {Error} If the notification is not found or the user is not
 *   authorized to view it
 */
export async function gethealthcarePlatformTechnicianNotificationsNotificationId(props: {
  technician: TechnicianPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  const { technician, notificationId } = props;

  // Fetch the notification for this ID, only if not deleted
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

  // Access control: Only the intended recipient (technician) can view
  if (notification.recipient_user_id !== technician.id) {
    throw new Error("Unauthorized: access denied");
  }

  // Map from DB fields to DTO, handling date/null/undefined as per strict rules
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
