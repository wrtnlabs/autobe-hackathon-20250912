import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a specific notification by its ID (healthcare_platform_notifications
 * table)
 *
 * This operation permanently deletes a notification record from the healthcare
 * platform, identified by its unique notificationId. System administrators only
 * may invoke this function. The deletion is a hard delete—no data will remain,
 * and the record is unrecoverable.
 *
 * Security:
 *
 * - Only authenticated system administrators (props.systemAdmin) may delete
 *   notifications.
 * - Attempting to delete notifications not found by their ID results in a 404 Not
 *   Found error.
 * - This operation should be logged for audit, but core provider does not handle
 *   logging directly.
 *
 * @param props - The operation parameters:
 *
 *   - SystemAdmin: The authenticated SystemadminPayload performing the deletion
 *       (must have type 'systemAdmin')
 *   - NotificationId: The unique identifier of the notification to delete
 *
 * @returns Void
 * @throws {Error} If props.systemAdmin is missing/wrong type (Unauthorized)
 * @throws {Error} If the notification to delete does not exist (404 Not Found)
 */
export async function deletehealthcarePlatformSystemAdminNotificationsNotificationId(props: {
  systemAdmin: SystemadminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, notificationId } = props;

  // 1. Enforce role: Only systemAdmin allowed
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error(
      "Unauthorized: Only system administrators may delete notifications.",
    );
  }

  // 2. Locate notification record; throw 404 if not found
  const notification =
    await MyGlobal.prisma.healthcare_platform_notifications.findUnique({
      where: { id: notificationId },
    });
  if (notification == null) {
    throw new Error("Notification not found");
  }

  // 3. Hard delete
  await MyGlobal.prisma.healthcare_platform_notifications.delete({
    where: { id: notificationId },
  });
}
