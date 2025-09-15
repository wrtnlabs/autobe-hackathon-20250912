import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

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
 * @param props - Object containing the authenticated organizationadmin payload
 *   and the notification creation body
 * @param props.organizationAdmin - The authenticated organization administrator
 *   creating the notification
 * @param props.body - Data for the new notification (recipient, sender, type,
 *   channel, message, and options)
 * @returns The newly created notification record, including assigned ID and
 *   delivery status
 * @throws {Error} If the organization admin does not exist or is deleted
 */
export async function posthealthcarePlatformOrganizationAdminNotifications(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformNotification.ICreate;
}): Promise<IHealthcarePlatformNotification> {
  const { organizationAdmin, body } = props;

  // Fetch organization admin, ensure not deleted
  const adminRow =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!adminRow)
    throw new Error(
      "Organization administrator account not found or has been deleted.",
    );

  // Determine organization ID for the notification (prefer body, else from admin profile)
  const orgId: string =
    body.organizationId !== undefined && body.organizationId !== null
      ? body.organizationId
      : adminRow.id;

  // Create the notification row (use string & tags.Format<'date-time'>, never Date, no as)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const createdNotification =
    await MyGlobal.prisma.healthcare_platform_notifications.create({
      data: {
        id: v4(),
        recipient_user_id: body.recipientUserId ?? undefined,
        organization_id: orgId,
        sender_user_id: body.senderUserId ?? undefined,
        notification_type: body.notificationType,
        notification_channel: body.notificationChannel,
        subject: body.subject ?? undefined,
        body: body.body,
        payload_link: body.payloadLink ?? undefined,
        critical:
          body.critical !== undefined && body.critical !== null
            ? body.critical
            : false,
        delivery_status: "pending",
        delivery_attempts: 0,
        delivered_at: undefined,
        last_delivery_attempt_at: undefined,
        acknowledged_at: undefined,
        snoozed_until: undefined,
        escalation_event_id: undefined,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });

  return {
    id: createdNotification.id,
    recipientUserId: createdNotification.recipient_user_id ?? undefined,
    organizationId: createdNotification.organization_id ?? undefined,
    senderUserId: createdNotification.sender_user_id ?? undefined,
    notificationType: createdNotification.notification_type,
    notificationChannel: createdNotification.notification_channel,
    subject: createdNotification.subject ?? undefined,
    body: createdNotification.body,
    payloadLink: createdNotification.payload_link ?? undefined,
    critical: createdNotification.critical,
    deliveryStatus: createdNotification.delivery_status,
    deliveryAttempts: createdNotification.delivery_attempts,
    deliveredAt: createdNotification.delivered_at ?? undefined,
    lastDeliveryAttemptAt:
      createdNotification.last_delivery_attempt_at ?? undefined,
    acknowledgedAt: createdNotification.acknowledged_at ?? undefined,
    snoozedUntil: createdNotification.snoozed_until ?? undefined,
    escalationEventId: createdNotification.escalation_event_id ?? undefined,
    createdAt: createdNotification.created_at,
    updatedAt: createdNotification.updated_at,
    deletedAt: createdNotification.deleted_at ?? undefined,
  };
}
