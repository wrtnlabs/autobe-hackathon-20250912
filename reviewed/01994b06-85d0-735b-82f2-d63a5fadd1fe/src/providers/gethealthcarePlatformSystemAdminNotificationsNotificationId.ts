import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This endpoint fetches the full notification record by ID, returning detailed
 * metadata, subject, content, delivery status, timestamps, escalation info, and
 * links for the requested notification. Only accessible by authenticated system
 * admins. Access is denied for non-existent, deleted, or unauthorized records.
 *
 * Strict mapping between DB schema and API DTO fields; snake_case fields in
 * database are mapped to camelCase as per contract. All dates are correctly
 * formatted as ISO date-time strings. Soft-deleted notifications are
 * inaccessible.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated system admin payload
 * @param props.notificationId - UUID of the notification to retrieve
 * @returns The notification event data for the given ID
 * @throws {Error} If the notification does not exist, is deleted, or access is
 *   denied
 */
export async function gethealthcarePlatformSystemAdminNotificationsNotificationId(props: {
  systemAdmin: SystemadminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  const { notificationId } = props;
  // Fetch only active (not deleted) notification
  const row = await MyGlobal.prisma.healthcare_platform_notifications.findFirst(
    {
      where: { id: notificationId, deleted_at: null },
    },
  );
  if (!row) throw new Error("Notification not found");
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id ?? undefined,
    organizationId: row.organization_id ?? undefined,
    senderUserId: row.sender_user_id ?? undefined,
    notificationType: row.notification_type,
    notificationChannel: row.notification_channel,
    subject: row.subject ?? undefined,
    body: row.body,
    payloadLink: row.payload_link ?? undefined,
    critical: row.critical,
    deliveryStatus: row.delivery_status,
    deliveryAttempts: row.delivery_attempts,
    deliveredAt:
      row.delivered_at !== null && row.delivered_at !== undefined
        ? toISOStringSafe(row.delivered_at)
        : undefined,
    lastDeliveryAttemptAt:
      row.last_delivery_attempt_at !== null &&
      row.last_delivery_attempt_at !== undefined
        ? toISOStringSafe(row.last_delivery_attempt_at)
        : undefined,
    acknowledgedAt:
      row.acknowledged_at !== null && row.acknowledged_at !== undefined
        ? toISOStringSafe(row.acknowledged_at)
        : undefined,
    snoozedUntil:
      row.snoozed_until !== null && row.snoozed_until !== undefined
        ? toISOStringSafe(row.snoozed_until)
        : undefined,
    escalationEventId: row.escalation_event_id ?? undefined,
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
    deletedAt:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  };
}
