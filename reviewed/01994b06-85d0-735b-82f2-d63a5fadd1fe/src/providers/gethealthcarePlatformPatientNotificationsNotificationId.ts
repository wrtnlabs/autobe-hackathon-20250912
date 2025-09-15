import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Retrieve full details of a specific notification (Notifications table).
 *
 * This endpoint returns the full details for a single notification event
 * identified by notificationId, provided the requesting patient matches the
 * intended recipient. Returns notification subject, message, delivery metadata,
 * routing, timestamps, and all schema-mapped attributes. Throws error if not
 * found or unauthorized. All date values are correctly formatted as ISO8601
 * strings; never uses Date type.
 *
 * Strict role enforcement: only the patient recipient may view this record via
 * this endpoint. Sensitive or deleted records are access-controlled and will
 * yield error. All access is expected to be audited elsewhere in the
 * notification read pipeline.
 *
 * @param props - Parameter object
 * @param props.patient - PatientPayload: authenticated patient (id: uuid, type:
 *   "patient")
 * @param props.notificationId - UUID of notification to retrieve
 * @returns IHealthcarePlatformNotification - Full notification record for
 *   recipient, formatted for API
 * @throws {Error} If notification is not found, deleted, or user is
 *   unauthorized
 */
export async function gethealthcarePlatformPatientNotificationsNotificationId(props: {
  patient: PatientPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotification> {
  const { patient, notificationId } = props;

  const row = await MyGlobal.prisma.healthcare_platform_notifications.findFirst(
    {
      where: {
        id: notificationId,
        deleted_at: null,
        recipient_user_id: patient.id,
      },
    },
  );
  if (!row) {
    throw new Error("Notification not found or access denied");
  }

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
    deliveredAt: row.delivered_at
      ? toISOStringSafe(row.delivered_at)
      : undefined,
    lastDeliveryAttemptAt: row.last_delivery_attempt_at
      ? toISOStringSafe(row.last_delivery_attempt_at)
      : undefined,
    acknowledgedAt: row.acknowledged_at
      ? toISOStringSafe(row.acknowledged_at)
      : undefined,
    snoozedUntil: row.snoozed_until
      ? toISOStringSafe(row.snoozed_until)
      : undefined,
    escalationEventId: row.escalation_event_id ?? undefined,
    createdAt: toISOStringSafe(row.created_at),
    updatedAt: toISOStringSafe(row.updated_at),
    deletedAt: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  };
}
