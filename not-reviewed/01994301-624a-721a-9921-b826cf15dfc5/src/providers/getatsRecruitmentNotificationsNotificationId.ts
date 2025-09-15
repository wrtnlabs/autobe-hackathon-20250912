import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";

/**
 * Get notification details by notificationId from
 * ats_recruitment_notifications.
 *
 * This operation retrieves the detailed information of a specific notification
 * event from the ats_recruitment_notifications table by its unique identifier.
 * It returns details including recipient(s) by role, event type, reference
 * linkage, dynamic context data, delivery status, and audit metadata.
 *
 * Access is strictly denied if the notification is not found or is
 * soft-deleted. All returned date values are formatted as string &
 * tags.Format<'date-time'>. Optional recipient fields and payload_json are set
 * as undefined if not present in the data.
 *
 * @param props - Contains notificationId: Unique identifier (UUID) of the
 *   notification to retrieve
 * @returns IAtsRecruitmentNotification containing all notification
 *   metadata-fields
 * @throws {Error} If the notification is not found or is deleted (soft delete)
 */
export async function getatsRecruitmentNotificationsNotificationId(props: {
  notificationId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentNotification> {
  const { notificationId } = props;
  const notification =
    await MyGlobal.prisma.ats_recruitment_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification || notification.deleted_at !== null) {
    throw new Error("Notification not found");
  }
  return {
    id: notification.id,
    recipient_applicant_id:
      notification.recipient_applicant_id === null
        ? undefined
        : notification.recipient_applicant_id,
    recipient_hrrecruiter_id:
      notification.recipient_hrrecruiter_id === null
        ? undefined
        : notification.recipient_hrrecruiter_id,
    recipient_techreviewer_id:
      notification.recipient_techreviewer_id === null
        ? undefined
        : notification.recipient_techreviewer_id,
    recipient_systemadmin_id:
      notification.recipient_systemadmin_id === null
        ? undefined
        : notification.recipient_systemadmin_id,
    event_type: notification.event_type,
    reference_table: notification.reference_table,
    reference_id: notification.reference_id,
    payload_json:
      notification.payload_json === null
        ? undefined
        : notification.payload_json,
    status: notification.status,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at:
      notification.deleted_at === null
        ? undefined
        : toISOStringSafe(notification.deleted_at),
  };
}
