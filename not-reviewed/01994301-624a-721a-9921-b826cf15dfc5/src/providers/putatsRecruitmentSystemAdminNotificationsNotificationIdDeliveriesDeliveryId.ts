import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationDelivery";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update notification delivery attempt record
 * (ats_recruitment_notification_deliveries).
 *
 * This API modifies an existing notification delivery attempt in the
 * ats_recruitment_notification_deliveries table. It updates properties such as
 * delivery status, delivery channel, recipient address, or delivery result
 * details. This function is essential for operational corrections following
 * external system callbacks, manual compliance corrections, or business process
 * updates in notification delivery tracking.
 *
 * Authorization: Only system administrators (systemAdmin) can use this API.
 * Attempts to update are validated for notificationId → deliveryId relationship
 * and soft deletion status. All modifications update the updated_at field for
 * audit compliance.
 *
 * @param props - Provider parameters
 * @param props.systemAdmin - Authenticated system administrator
 *   (SystemadminPayload)
 * @param props.notificationId - UUID for the parent notification event
 * @param props.deliveryId - UUID for the target notification delivery attempt
 * @param props.body - Fields for updating delivery attempt status or meta
 *   (optional, partial)
 * @returns The full updated notification delivery attempt record after all
 *   changes are applied. Date fields are returned as ISO8601 strings.
 * @throws {Error} If delivery record not found under notificationId, or was
 *   soft-deleted (deleted_at set).
 */
export async function putatsRecruitmentSystemAdminNotificationsNotificationIdDeliveriesDeliveryId(props: {
  systemAdmin: SystemadminPayload;
  notificationId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentNotificationDelivery.IUpdate;
}): Promise<IAtsRecruitmentNotificationDelivery> {
  const { systemAdmin, notificationId, deliveryId, body } = props;

  // Step 1: Retrieve the active delivery attempt record for update. Must match notificationId and not be soft-deleted.
  const delivery =
    await MyGlobal.prisma.ats_recruitment_notification_deliveries.findFirst({
      where: {
        id: deliveryId,
        notification_id: notificationId,
        deleted_at: null,
      },
    });
  if (!delivery) {
    throw new Error("Notification delivery record not found or access denied");
  }

  // Step 2: Prepare update fields, including current updated_at. Only update provided fields; skip undefined.
  const now = toISOStringSafe(new Date());
  const updateData: Record<string, unknown> = {
    updated_at: now,
  };
  if (body.delivery_channel !== undefined)
    updateData.delivery_channel = body.delivery_channel;
  if (body.recipient_address !== undefined)
    updateData.recipient_address = body.recipient_address;
  if (body.delivery_status !== undefined)
    updateData.delivery_status = body.delivery_status;
  if (body.delivery_result_detail !== undefined)
    updateData.delivery_result_detail = body.delivery_result_detail;
  if (body.delivery_attempt !== undefined)
    updateData.delivery_attempt = body.delivery_attempt;
  if (body.delivered_at !== undefined)
    updateData.delivered_at = body.delivered_at;
  if (body.failed_at !== undefined) updateData.failed_at = body.failed_at;

  // Step 3: Update record
  const updated =
    await MyGlobal.prisma.ats_recruitment_notification_deliveries.update({
      where: { id: deliveryId },
      data: updateData,
    });

  // Step 4: Map updated model to DTO, with explicit handling of date fields and nullable/optional semantics.
  return {
    id: updated.id,
    notification_id: updated.notification_id,
    delivery_channel: updated.delivery_channel,
    recipient_address: updated.recipient_address,
    delivery_status: updated.delivery_status,
    delivery_result_detail: updated.delivery_result_detail ?? undefined,
    delivery_attempt: updated.delivery_attempt,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : undefined,
    failed_at: updated.failed_at
      ? toISOStringSafe(updated.failed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
