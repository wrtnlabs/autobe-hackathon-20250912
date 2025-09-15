import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";

/**
 * Update notification details, status, or recipients by notificationId.
 *
 * This operation updates an existing notification event stored in
 * ats_recruitment_notifications, modifying allowed fields such as status or
 * payload. Only business-policy-revisable fields are editable; all others are
 * immutable. All changes are audited; immutable fields cannot be changed and
 * will cause a validation error if attempted. If the notification does not
 * exist or is already deleted (deleted_at is non-null), this function throws an
 * error. Returns the refreshed notification entity after update, with all
 * fields formatted per API contract.
 *
 * @param props - Update parameters
 * @param props.notificationId - Unique identifier of the notification to update
 *   (UUID)
 * @param props.body - Notification fields eligible for update: status,
 *   payload_json, or deleted_at
 * @returns The updated notification entity, including all properties per
 *   interface
 * @throws {Error} When notification is not found or is already deleted and
 *   cannot be updated
 */
export async function putatsRecruitmentNotificationsNotificationId(props: {
  notificationId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentNotification.IUpdate;
}): Promise<IAtsRecruitmentNotification> {
  const { notificationId, body } = props;
  // Fetch the notification
  const notification =
    await MyGlobal.prisma.ats_recruitment_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification) throw new Error("Notification not found");
  // Forbid update on soft-deleted notifications
  if (notification.deleted_at)
    throw new Error("Cannot update a deleted notification");
  // Prepare update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ats_recruitment_notifications.update({
    where: { id: notificationId },
    data: {
      status: body.status ?? undefined,
      payload_json: body.payload_json ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    recipient_applicant_id: updated.recipient_applicant_id ?? undefined,
    recipient_hrrecruiter_id: updated.recipient_hrrecruiter_id ?? undefined,
    recipient_techreviewer_id: updated.recipient_techreviewer_id ?? undefined,
    recipient_systemadmin_id: updated.recipient_systemadmin_id ?? undefined,
    event_type: updated.event_type,
    reference_table: updated.reference_table,
    reference_id: updated.reference_id,
    payload_json: updated.payload_json ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
