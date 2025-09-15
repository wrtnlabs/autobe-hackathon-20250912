import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create and issue a new notification to recipient(s) (Notifications table).
 *
 * Enables authorized staff or service components to issue new notifications to
 * users, organizations, or roles within the healthcarePlatform. The request
 * body encapsulates all notification creation parameters: recipient
 * identifiers, organization, notification type, channel, subject, message body,
 * critical status, and optional escalation instructions.
 *
 * The operation validates the payload according to strict notification schema
 * comments, ensuring delivery channels and recipient roles are permitted and
 * that content respects privacy and compliance regulations. Upon successful
 * creation, the notification is queued for delivery, targeting channels (email,
 * SMS, in-app, etc.) as configured. Returns the newly created notification's
 * full data for tracking or user interface display.
 *
 * Security checks ensure only permitted roles (typically admin, staff, or
 * trusted integration services) may invoke this endpoint to create
 * notifications. Audit trails are automatically generated. Related APIs include
 * notification search, recipient preference queries, and delivery status
 * updates.
 *
 * @param props - SystemAdmin: The authenticated SystemadminPayload performing
 *   the operation (authorization required) body: The notification creation
 *   parameters (recipient, type, channel, message, etc.)
 * @returns The newly created notification record with all required and optional
 *   fields, ready for delivery tracking and UI display.
 * @throws {Error} If the database fails to create the record.
 */
export async function posthealthcarePlatformSystemAdminNotifications(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformNotification.ICreate;
}): Promise<IHealthcarePlatformNotification> {
  // Timestamp for creation and update
  const now = toISOStringSafe(new Date());

  // Create notification in DB
  const created =
    await MyGlobal.prisma.healthcare_platform_notifications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        recipient_user_id: props.body.recipientUserId ?? undefined,
        organization_id: props.body.organizationId ?? undefined,
        sender_user_id: props.body.senderUserId ?? undefined,
        notification_type: props.body.notificationType,
        notification_channel: props.body.notificationChannel,
        subject: props.body.subject ?? undefined,
        body: props.body.body,
        payload_link: props.body.payloadLink ?? undefined,
        critical:
          typeof props.body.critical === "boolean"
            ? props.body.critical
            : false,
        delivery_status: "pending",
        delivery_attempts: 0,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    recipientUserId: created.recipient_user_id ?? undefined,
    organizationId: created.organization_id ?? undefined,
    senderUserId: created.sender_user_id ?? undefined,
    notificationType: created.notification_type,
    notificationChannel: created.notification_channel,
    subject: created.subject ?? undefined,
    body: created.body,
    payloadLink: created.payload_link ?? undefined,
    critical: created.critical,
    deliveryStatus: created.delivery_status,
    deliveryAttempts: created.delivery_attempts,
    deliveredAt: created.delivered_at
      ? toISOStringSafe(created.delivered_at)
      : undefined,
    lastDeliveryAttemptAt: created.last_delivery_attempt_at
      ? toISOStringSafe(created.last_delivery_attempt_at)
      : undefined,
    acknowledgedAt: created.acknowledged_at
      ? toISOStringSafe(created.acknowledged_at)
      : undefined,
    snoozedUntil: created.snoozed_until
      ? toISOStringSafe(created.snoozed_until)
      : undefined,
    escalationEventId: created.escalation_event_id ?? undefined,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
