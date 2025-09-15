import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update an existing notification record by its unique identifier.
 *
 * This function allows a developer to update properties of their notification,
 * such as marking it as read or unread using `is_read` and setting the
 * `read_at` timestamp.
 *
 * Authorization is enforced by verifying the notification belongs to the
 * authenticated developer.
 *
 * @param props - Function input containing the developer payload, notification
 *   ID, and update body
 * @param props.developer - Authenticated developer making the request
 * @param props.id - Unique identifier of the notification to update
 * @param props.body - Update fields, including `is_read` flag and `read_at`
 *   timestamp
 * @returns The updated notification record with all fields
 * @throws {Error} If notification not found
 * @throws {Error} If the developer is unauthorized to update the notification
 */
export async function puttaskManagementDeveloperNotificationsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotification.IUpdate;
}): Promise<ITaskManagementNotification> {
  const { developer, id, body } = props;

  // Retrieve the notification
  const notification =
    await MyGlobal.prisma.task_management_notifications.findUnique({
      where: { id },
    });

  if (!notification) {
    throw new Error("Notification not found");
  }

  if (notification.user_id !== developer.id) {
    throw new Error(
      "Unauthorized: cannot update a notification you do not own",
    );
  }

  const updateData: ITaskManagementNotification.IUpdate = {};

  if (typeof body.is_read === "boolean") {
    updateData.is_read = body.is_read;
  }

  if ("read_at" in body) {
    updateData.read_at =
      body.read_at === null ? null : (body.read_at ?? undefined);
  }

  const updated = await MyGlobal.prisma.task_management_notifications.update({
    where: { id },
    data: updateData,
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    task_id: updated.task_id === null ? null : (updated.task_id ?? undefined),
    notification_type: updated.notification_type,
    is_read: updated.is_read,
    read_at: updated.read_at ? toISOStringSafe(updated.read_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
