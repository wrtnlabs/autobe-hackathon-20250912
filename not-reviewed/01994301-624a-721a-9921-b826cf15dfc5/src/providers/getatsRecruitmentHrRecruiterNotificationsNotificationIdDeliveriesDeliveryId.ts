import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Get details for a specific notification delivery attempt
 * (ats_recruitment_notification_deliveries).
 *
 * Retrieves comprehensive delivery metadata for the specified notification
 * delivery, including channel, recipient details, status, timestamps,
 * diagnostic metadata, and result information, as stored in the
 * ats_recruitment_notification_deliveries table. Only the intended HR recruiter
 * recipient may access the full detail.
 *
 * Authorization: Only the HR recruiter matching the notification's
 * recipient_hrrecruiter_id may retrieve this delivery; access by any other
 * actor is denied even if a valid deliveryId/notificationId is provided.
 *
 * @param props - HrRecruiter: The authenticated HR recruiter requesting the
 *   detail. notificationId: UUID of the parent notification. deliveryId: UUID
 *   of the specific notification delivery attempt.
 * @returns The complete delivery record for audit or troubleshooting.
 * @throws Error if the delivery does not exist or the HR recruiter is not
 *   authorized to view the detail.
 */
export async function getatsRecruitmentHrRecruiterNotificationsNotificationIdDeliveriesDeliveryId(props: {
  hrRecruiter: HrrecruiterPayload;
  notificationId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentNotificationDelivery> {
  const { hrRecruiter, notificationId, deliveryId } = props;

  const delivery =
    await MyGlobal.prisma.ats_recruitment_notification_deliveries.findFirst({
      where: {
        id: deliveryId,
        notification_id: notificationId,
        deleted_at: null,
      },
      include: {
        notification: true,
      },
    });

  if (!delivery) {
    throw new Error("Notification delivery not found.");
  }

  // Authorization: Only intended HR recruiter can access their own notification delivery detail
  if (
    !delivery.notification ||
    delivery.notification.recipient_hrrecruiter_id !== hrRecruiter.id
  ) {
    throw new Error("Unauthorized");
  }

  return {
    id: delivery.id,
    notification_id: delivery.notification_id,
    delivery_channel: delivery.delivery_channel,
    recipient_address: delivery.recipient_address,
    delivery_status: delivery.delivery_status,
    delivery_result_detail: delivery.delivery_result_detail ?? undefined,
    delivery_attempt: delivery.delivery_attempt,
    delivered_at: delivery.delivered_at
      ? toISOStringSafe(delivery.delivered_at)
      : undefined,
    failed_at: delivery.failed_at
      ? toISOStringSafe(delivery.failed_at)
      : undefined,
    created_at: toISOStringSafe(delivery.created_at),
    updated_at: toISOStringSafe(delivery.updated_at),
    deleted_at: delivery.deleted_at
      ? toISOStringSafe(delivery.deleted_at)
      : undefined,
  };
}
