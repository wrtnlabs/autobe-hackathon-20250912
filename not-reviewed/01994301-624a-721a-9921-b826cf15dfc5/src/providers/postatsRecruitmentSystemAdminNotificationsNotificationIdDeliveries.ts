import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new notification delivery attempt
 * (ats_recruitment_notification_deliveries).
 *
 * Inserts a new delivery attempt row into the notification delivery table for a
 * given notification event. This operation is restricted to systemadmin role
 * and is used by integration middleware, backend services, or operational
 * dashboards to track delivery workflow and audit every dispatch/retry.
 *
 * Authorization: Only systemadmin accounts may create delivery records. Fails
 * if the notificationId does not exist.
 *
 * @param props - The operation props
 * @param props.systemAdmin - The authenticated systemadmin requesting the
 *   operation
 * @param props.notificationId - The parent notification UUID for which this
 *   delivery is being created
 * @param props.body - The data for the notification delivery creation
 * @returns The newly created notification delivery record, with all audit
 *   fields
 * @throws {Error} If authorization fails or parent notification does not exist
 */
export async function postatsRecruitmentSystemAdminNotificationsNotificationIdDeliveries(props: {
  systemAdmin: SystemadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentNotificationDelivery.ICreate;
}): Promise<IAtsRecruitmentNotificationDelivery> {
  // 1. Authorization check
  if (!props.systemAdmin || props.systemAdmin.type !== "systemadmin") {
    throw new Error(
      "Unauthorized: Only systemadmin may create notification deliveries.",
    );
  }

  // 2. Ensure notificationId exists
  const notification =
    await MyGlobal.prisma.ats_recruitment_notifications.findFirst({
      where: { id: props.notificationId },
      select: { id: true },
    });
  if (!notification) {
    throw new Error("Notification not found for specified notificationId");
  }

  // 3. Prepare timestamp (ISO string)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 4. Insert the new notification delivery record
  const created =
    await MyGlobal.prisma.ats_recruitment_notification_deliveries.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        notification_id: props.notificationId,
        delivery_channel: props.body.delivery_channel,
        recipient_address: props.body.recipient_address,
        delivery_status: props.body.delivery_status,
        delivery_result_detail: props.body.delivery_result_detail ?? null,
        delivery_attempt: props.body.delivery_attempt,
        delivered_at: props.body.delivered_at ?? null,
        failed_at: props.body.failed_at ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  // 5. Return the full delivery record as per DTO, ensuring date branding where appropriate
  return {
    id: created.id,
    notification_id: created.notification_id,
    delivery_channel: created.delivery_channel,
    recipient_address: created.recipient_address,
    delivery_status: created.delivery_status,
    delivery_result_detail: created.delivery_result_detail ?? null,
    delivery_attempt: created.delivery_attempt,
    delivered_at: created.delivered_at
      ? toISOStringSafe(created.delivered_at)
      : undefined,
    failed_at: created.failed_at
      ? toISOStringSafe(created.failed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
