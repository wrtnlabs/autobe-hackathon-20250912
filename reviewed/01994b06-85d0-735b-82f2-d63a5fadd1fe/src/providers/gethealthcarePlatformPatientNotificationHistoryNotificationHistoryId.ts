import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationHistory";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Retrieve a single notification delivery history event
 * (healthcare_platform_notification_history table).
 *
 * This function retrieves the details of an individual notification delivery
 * history event for a patient, including status, delivery channel, and event
 * metadata. Only the patient recipient of the notification may access their own
 * notification history. If the record does not exist or does not belong to the
 * authenticated patient, an error is thrown for privacy.
 *
 * @param props - Properties for the operation
 * @param props.patient - The authenticated patient user (authorization context)
 * @param props.notificationHistoryId - UUID of the notification history event
 *   to retrieve
 * @returns Full details of the requested notification delivery history event
 * @throws {Error} If the notification history is not found, deleted, or access
 *   is forbidden
 */
export async function gethealthcarePlatformPatientNotificationHistoryNotificationHistoryId(props: {
  patient: PatientPayload;
  notificationHistoryId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformNotificationHistory> {
  const { patient, notificationHistoryId } = props;
  // Fetch the notification history record and join parent notification
  const history =
    await MyGlobal.prisma.healthcare_platform_notification_history.findFirst({
      where: { id: notificationHistoryId },
      include: {
        notification: true,
      },
    });
  // Enforce ownership and not deleted
  if (
    !history ||
    !history.notification ||
    history.notification.recipient_user_id !== patient.id ||
    history.notification.deleted_at !== null
  ) {
    throw new Error("Notification history not found");
  }
  return {
    id: history.id,
    notification_id: history.notification_id,
    event_type: history.event_type,
    event_time: toISOStringSafe(history.event_time),
    delivery_channel: history.delivery_channel,
    delivery_status: history.delivery_status,
    details: history.details ?? undefined,
    created_at: toISOStringSafe(history.created_at),
  };
}
