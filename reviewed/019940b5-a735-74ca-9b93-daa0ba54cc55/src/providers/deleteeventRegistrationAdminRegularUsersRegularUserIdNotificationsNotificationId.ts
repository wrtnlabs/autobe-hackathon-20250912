import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a notification of a regular user by notification ID.
 *
 * This operation permanently removes the notification record from the system.
 * Authorization is required to ensure only admins can perform this action.
 *
 * @param props - Object containing the admin credentials and identifiers.
 * @param props.admin - The authorized admin performing the deletion.
 * @param props.regularUserId - UUID of the target regular user.
 * @param props.notificationId - UUID of the notification to delete.
 * @returns A Promise that resolves when the deletion is complete.
 * @throws {Error} When the notification does not exist or does not belong to
 *   the specified user.
 */
export async function deleteeventRegistrationAdminRegularUsersRegularUserIdNotificationsNotificationId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, regularUserId, notificationId } = props;

  // Verify that the notification exists and is linked to the regular user
  await MyGlobal.prisma.event_registration_notifications.findUniqueOrThrow({
    where: {
      id: notificationId,
      user_id: regularUserId,
    },
  });

  // Permanently delete the notification record
  await MyGlobal.prisma.event_registration_notifications.delete({
    where: {
      id: notificationId,
    },
  });
}
