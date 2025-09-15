import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";

/**
 * Permanently erase a notification by notificationId, cascading delete for
 * delivery/failure records.
 *
 * This operation deletes the ats_recruitment_notifications record matching the
 * given notificationId, enforcing hard delete semantics. All associated
 * delivery (ats_recruitment_notification_deliveries) and failure
 * (ats_recruitment_notification_failures) records for the notification are also
 * erased in one transaction.
 *
 * If the notification does not exist, an error is thrown. (The operation is not
 * idempotent; repeated deletes will fail.)
 *
 * Note: This implementation assumes there is no actor or auth context
 * available, so ownership and admin privilege checks are not enforced. Audit
 * logging cannot be performed due to missing context. Guarantees integrity and
 * irreversibility, but delegates access control to external middleware or call
 * chain.
 *
 * @param props - Request properties.
 * @param props.notificationId - Unique identifier of the notification to erase
 *   (UUID).
 * @returns Void
 * @throws {Error} If the notification does not exist.
 */
export async function deleteatsRecruitmentNotificationsNotificationId(props: {
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the notification exists
  const notification =
    await MyGlobal.prisma.ats_recruitment_notifications.findUnique({
      where: { id: props.notificationId },
      select: { id: true },
    });
  if (!notification) {
    throw new Error("Notification not found");
  }

  // Perform all deletes in a transaction for atomicity
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ats_recruitment_notification_failures.deleteMany({
      where: { notification_id: props.notificationId },
    }),
    MyGlobal.prisma.ats_recruitment_notification_deliveries.deleteMany({
      where: { notification_id: props.notificationId },
    }),
    MyGlobal.prisma.ats_recruitment_notifications.delete({
      where: { id: props.notificationId },
    }),
  ]);
  // Operation complete: notification and all children deleted; no return value on success.
}
