import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Deletes a notification by ID from task_management_notifications.
 *
 * This operation permanently removes the notification record identified by the
 * provided ID. Authorization is enforced by ensuring the notification belongs
 * to the authenticated designer.
 *
 * @param props - Object containing authentication and notification ID.
 * @param props.designer - The authenticated designer performing the deletion.
 * @param props.id - The UUID of the notification to delete.
 * @throws {Error} When the notification does not exist or is not owned by the
 *   designer.
 */
export async function deletetaskManagementDesignerNotificationsId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { designer, id } = props;

  // Verify ownership and existence
  const notification =
    await MyGlobal.prisma.task_management_notifications.findFirst({
      where: { id, user_id: designer.id },
    });

  if (!notification) {
    throw new Error("Notification not found");
  }

  await MyGlobal.prisma.task_management_notifications.delete({
    where: { id },
  });
}
