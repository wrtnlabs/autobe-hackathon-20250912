import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This function fetches the detailed information for a given notification by
 * its unique notificationId. It strictly enforces access policies—only the
 * recipient or sender medical doctor may view the notification's contents. All
 * date/time fields are safely converted to ISO strings, and all optional fields
 * are handled for correct null/undefined semantics.
 *
 * @param props - Object containing:
 *
 *   - MedicalDoctor: The authenticated medical doctor payload.
 *   - NotificationId: The UUID of the notification to retrieve.
 *
 * @returns The complete notification record in IHealthcarePlatformNotification
 *   format.
 * @throws {Error} If the notification does not exist, is deleted, or if the
 *   medical doctor is not authorized to view it.
 */
export async function gethealthcarePlatformMedicalDoctorNotificationsNotificationId(props: {
  medicalDoctor: MedicaldoctorPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  // Fetch notification (must not be soft-deleted)
  const notif =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: {
        id: props.notificationId,
        deleted_at: null,
      },
    });
  if (!notif) throw new Error("Notification not found");
  // Authorization: only recipient or sender doctor can access
  const isRecipient = notif.recipient_user_id === props.medicalDoctor.id;
  const isSender = notif.sender_user_id === props.medicalDoctor.id;
  if (!isRecipient && !isSender) {
    throw new Error(
      "Forbidden: You are not authorized to view this notification",
    );
  }
  // Build DTO, normalizing null/undefined and converting dates to ISO strings
  return {
    id: notif.id,
    recipientUserId:
      notif.recipient_user_id === null ? undefined : notif.recipient_user_id,
    organizationId:
      notif.organization_id === null ? undefined : notif.organization_id,
    senderUserId:
      notif.sender_user_id === null ? undefined : notif.sender_user_id,
    notificationType: notif.notification_type,
    notificationChannel: notif.notification_channel,
    subject: notif.subject === null ? undefined : notif.subject,
    body: notif.body,
    payloadLink: notif.payload_link === null ? undefined : notif.payload_link,
    critical: notif.critical,
    deliveryStatus: notif.delivery_status,
    deliveryAttempts: notif.delivery_attempts,
    deliveredAt:
      notif.delivered_at === null
        ? undefined
        : toISOStringSafe(notif.delivered_at),
    lastDeliveryAttemptAt:
      notif.last_delivery_attempt_at === null
        ? undefined
        : toISOStringSafe(notif.last_delivery_attempt_at),
    acknowledgedAt:
      notif.acknowledged_at === null
        ? undefined
        : toISOStringSafe(notif.acknowledged_at),
    snoozedUntil:
      notif.snoozed_until === null
        ? undefined
        : toISOStringSafe(notif.snoozed_until),
    escalationEventId:
      notif.escalation_event_id === null
        ? undefined
        : notif.escalation_event_id,
    createdAt: toISOStringSafe(notif.created_at),
    updatedAt: toISOStringSafe(notif.updated_at),
    deletedAt:
      notif.deleted_at === null ? undefined : toISOStringSafe(notif.deleted_at),
  };
}
