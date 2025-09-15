import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Deletes a notification by ID from task_management_notifications.
 *
 * This operation permanently removes the notification record.
 *
 * @param props - Object containing authentication and parameters
 * @param props.pm - Authenticated Project Manager payload
 * @param props.id - UUID of the notification to delete
 * @throws {Error} When the notification with given ID does not exist
 */
export async function deletetaskManagementPmNotificationsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, id } = props;

  // Ensure the notification exists
  const notification =
    await MyGlobal.prisma.task_management_notifications.findUnique({
      where: { id },
    });

  if (!notification) {
    throw new Error(`Notification with id ${id} not found.`);
  }

  // Authorization check is implicit due to PM role; no user-specific checks required

  // Perform hard delete permanently
  await MyGlobal.prisma.task_management_notifications.delete({
    where: { id },
  });
}
