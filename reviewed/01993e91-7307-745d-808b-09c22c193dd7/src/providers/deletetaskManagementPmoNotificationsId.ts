import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Deletes a notification by its unique ID from the
 * task_management_notifications table.
 *
 * This operation permanently removes the notification record. It requires the
 * caller to be authenticated as a Project Management Officer (PMO).
 *
 * @param props - Object containing the PMO payload and the notification ID to
 *   delete
 * @param props.pmo - Authenticated PMO user information
 * @param props.id - UUID of the notification to delete
 * @throws {Error} Throws if the notification with the specified ID does not
 *   exist
 */
export async function deletetaskManagementPmoNotificationsId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, id } = props;

  // Verify the notification exists
  await MyGlobal.prisma.task_management_notifications.findUniqueOrThrow({
    where: { id },
  });

  // Permanently delete the notification
  await MyGlobal.prisma.task_management_notifications.delete({
    where: { id },
  });
}
