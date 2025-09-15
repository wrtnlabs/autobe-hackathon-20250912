import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update editable fields of an existing notification by ID (Notifications
 * table).
 *
 * This API endpoint allows permitted organization administrators to update
 * select attributes of an existing notification event, identified by
 * notificationId. Only update-allowed fields are modified (delivery status,
 * escalation references, acknowledgment timestamps, etc.). Attempts to update
 * immutable attributes such as ID or creation time will result in error.
 * Authorization strictly checks that the notification belongs to the same
 * organization as the admin.
 *
 * @param props - Properties for the update operation
 * @param props.organizationAdmin - The authenticated organization administrator
 *   (OrganizationadminPayload)
 * @param props.notificationId - The UUID of the notification to update
 * @param props.body - The fields to update for the notification
 *   (IHealthcarePlatformNotification.IUpdate)
 * @returns The updated notification record as IHealthcarePlatformNotification
 * @throws {Error} If the notification does not exist or admin is not authorized
 */
export async function puthealthcarePlatformOrganizationAdminNotificationsNotificationId(props: {
  organizationAdmin: OrganizationadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformNotification.IUpdate;
}): Promise<IHealthcarePlatformNotification> {
  const { organizationAdmin, notificationId, body } = props;

  // Fetch notification by id
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification) throw new Error("Notification not found");

  // Authorization: Notification must belong to admin's org
  if (
    notification.organization_id == null ||
    organizationAdmin.id !== notification.organization_id
  ) {
    throw new Error(
      "Unauthorized: Cannot update notification outside your organization context",
    );
  }

  // Only update allowed/editable fields (never update id/created_at/etc)
  await MyGlobal.prisma.healthcare_platform_notifications.update({
    where: { id: notificationId },
    data: {
      ...(body.notificationType !== undefined && {
        notification_type: body.notificationType,
      }),
      ...(body.notificationChannel !== undefined && {
        notification_channel: body.notificationChannel,
      }),
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.payloadLink !== undefined && { payload_link: body.payloadLink }),
      ...(body.deliveryStatus !== undefined && {
        delivery_status: body.deliveryStatus,
      }),
      ...(body.deliveryAttempts !== undefined && {
        delivery_attempts: body.deliveryAttempts,
      }),
      ...(body.deliveredAt !== undefined && { delivered_at: body.deliveredAt }),
      ...(body.lastDeliveryAttemptAt !== undefined && {
        last_delivery_attempt_at: body.lastDeliveryAttemptAt,
      }),
      ...(body.acknowledgedAt !== undefined && {
        acknowledged_at: body.acknowledgedAt,
      }),
      ...(body.snoozedUntil !== undefined && {
        snoozed_until: body.snoozedUntil,
      }),
      ...(body.escalationEventId !== undefined && {
        escalation_event_id: body.escalationEventId,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Refetch to get fresh data
  const updated =
    await MyGlobal.prisma.healthcare_platform_notifications.findUniqueOrThrow({
      where: { id: notificationId },
    });

  // Return with correct type handling for all UUID and date fields
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
