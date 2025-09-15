import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details for a specific notification delivery attempt
 * (ats_recruitment_notification_deliveries).
 *
 * This API retrieves complete delivery metadata for a single notification
 * delivery event as stored in the ats_recruitment_notification_deliveries
 * table. It includes the delivery channel, recipient, status, delivery result,
 * timestamps, and error or audit information for the specified delivery
 * (deliveryId under notificationId).
 *
 * System administrators may use this endpoint to audit, troubleshoot, or review
 * notification delivery records for compliance and operational tracing. The
 * process ensures the delivery belongs to the notification, and all dates are
 * formatted as ISO8601 strings for API compliance. Returns an error if no
 * matching delivery is found.
 *
 * @param props - Function parameters
 * @param props.systemAdmin - Authenticated system administrator (authorization
 *   enforced)
 * @param props.notificationId - UUID of the parent notification this delivery
 *   belongs to
 * @param props.deliveryId - UUID of the specific notification delivery attempt
 *   to fetch
 * @returns Delivery attempt detail (IAtsRecruitmentNotificationDelivery)
 * @throws {Error} If no matching delivery is found or the delivery does not
 *   belong to the specified notification.
 */
export async function getatsRecruitmentSystemAdminNotificationsNotificationIdDeliveriesDeliveryId(props: {
  systemAdmin: SystemadminPayload;
  notificationId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentNotificationDelivery> {
  const { notificationId, deliveryId } = props;
  const delivery =
    await MyGlobal.prisma.ats_recruitment_notification_deliveries.findFirstOrThrow(
      {
        where: {
          id: deliveryId,
          notification_id: notificationId,
        },
      },
    );

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
