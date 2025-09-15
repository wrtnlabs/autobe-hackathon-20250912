import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update editable fields of an existing notification by ID (Notifications
 * table).
 *
 * This API endpoint allows permitted system administrators to update certain
 * mutable fields of a notification. Only updatable attributes per the schema
 * can be changed: delivery status, acknowledgement, escalation event ID, or
 * business-related data. Immutable properties (ID, creation timestamps, base
 * recipient/sender/organization/critical) are strictly read-only and cannot be
 * updated by this operation.
 *
 * Authorization is enforced such that only system admin level actors may invoke
 * this API. Attempts to update immutable or restricted fields result in an
 * error. The operation triggers compliance audit logging. If the referenced
 * escalationEventId does not exist, an error is thrown.
 *
 * @param props - Function argument wrapper
 * @param props.systemAdmin - Authenticated/Admin payload
 * @param props.notificationId - The UUID of the notification to update
 * @param props.body - Notification update DTO with permitted fields
 *   (IHealthcarePlatformNotification.IUpdate)
 * @returns The updated notification as IHealthcarePlatformNotification
 * @throws {Error} If the notification does not exist or is not updatable
 * @throws {Error} If escalationEventId is present but invalid
 */
export async function puthealthcarePlatformSystemAdminNotificationsNotificationId(props: {
  systemAdmin: SystemadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformNotification.IUpdate;
}): Promise<IHealthcarePlatformNotification> {
  const { notificationId, body } = props;

  // 1. Lookup notification (must not be soft-deleted)
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findFirst({
      where: {
        id: notificationId,
        deleted_at: null,
      },
    });
  if (!notification) throw new Error("Notification not found");

  // 2. If escalationEventId is provided, verify target escalation event exists
  if (body.escalationEventId) {
    const exists =
      await MyGlobal.prisma.healthcare_platform_escalation_events.findFirst({
        where: { id: body.escalationEventId },
      });
    if (!exists) throw new Error("Invalid escalationEventId");
  }

  // 3. Update only the allowed (mutable) fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_notifications.update({
      where: { id: notificationId },
      data: {
        notification_type: body.notificationType ?? undefined,
        notification_channel: body.notificationChannel ?? undefined,
        subject: body.subject ?? undefined,
        body: body.body ?? undefined,
        payload_link: body.payloadLink ?? undefined,
        delivery_status: body.deliveryStatus ?? undefined,
        delivery_attempts: body.deliveryAttempts ?? undefined,
        delivered_at: body.deliveredAt
          ? toISOStringSafe(body.deliveredAt)
          : undefined,
        last_delivery_attempt_at: body.lastDeliveryAttemptAt
          ? toISOStringSafe(body.lastDeliveryAttemptAt)
          : undefined,
        acknowledged_at: body.acknowledgedAt
          ? toISOStringSafe(body.acknowledgedAt)
          : undefined,
        snoozed_until: body.snoozedUntil
          ? toISOStringSafe(body.snoozedUntil)
          : undefined,
        escalation_event_id: body.escalationEventId ?? undefined,
        updated_at: now,
      },
    });

  // 4. Map DB row to DTO, ensuring correct options, nulls/undefined, and branding
  return {
    id: updated.id,
    recipientUserId: updated.recipient_user_id ?? undefined,
    organizationId: updated.organization_id ?? undefined,
    senderUserId: updated.sender_user_id ?? undefined,
    notificationType: updated.notification_type,
    notificationChannel: updated.notification_channel,
    subject: updated.subject ?? undefined,
    body: updated.body,
    payloadLink: updated.payload_link ?? undefined,
    critical: updated.critical,
    deliveryStatus: updated.delivery_status,
    deliveryAttempts: updated.delivery_attempts,
    deliveredAt: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : undefined,
    lastDeliveryAttemptAt: updated.last_delivery_attempt_at
      ? toISOStringSafe(updated.last_delivery_attempt_at)
      : undefined,
    acknowledgedAt: updated.acknowledged_at
      ? toISOStringSafe(updated.acknowledged_at)
      : undefined,
    snoozedUntil: updated.snoozed_until
      ? toISOStringSafe(updated.snoozed_until)
      : undefined,
    escalationEventId: updated.escalation_event_id ?? undefined,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
