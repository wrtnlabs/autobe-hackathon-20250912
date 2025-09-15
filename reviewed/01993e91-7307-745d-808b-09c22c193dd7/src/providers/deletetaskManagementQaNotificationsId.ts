import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Delete a notification by ID from task_management_notifications.
 *
 * This operation permanently removes the notification identified by its unique
 * ID. Only a QA user who owns the notification and where the notification is
 * not soft deleted can perform this operation.
 *
 * @param props - The properties containing authorization and notification ID.
 * @param props.qa - Authenticated QA user payload.
 * @param props.id - UUID of the notification to be deleted.
 * @throws {Error} If the notification does not exist, is soft deleted, or does
 *   not belong to the QA user.
 */
export async function deletetaskManagementQaNotificationsId(props: {
  qa: QaPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { qa, id } = props;

  // Verify existence and ownership
  await MyGlobal.prisma.task_management_notifications.findFirstOrThrow({
    where: {
      id,
      user_id: qa.id,
      deleted_at: null,
    },
  });

  // Perform hard delete
  await MyGlobal.prisma.task_management_notifications.delete({
    where: { id },
  });
}
