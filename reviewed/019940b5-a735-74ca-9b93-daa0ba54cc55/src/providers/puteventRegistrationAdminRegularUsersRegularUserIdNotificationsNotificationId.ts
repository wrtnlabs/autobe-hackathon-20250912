import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a notification of a regular user by notification ID.
 *
 * This function validates that the notification belongs to the specified
 * regular user. Then it applies partial updates to the notification's fields.
 *
 * @param props - Object containing admin authorization, regular user ID,
 *   notification ID, and update data
 * @returns Updated notification matching IEventRegistrationNotification
 * @throws Error if notification not found or does not belong to user
 */
export async function puteventRegistrationAdminRegularUsersRegularUserIdNotificationsNotificationId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
  body: IEventRegistrationNotification.IUpdate;
}): Promise<IEventRegistrationNotification> {
  const { admin, regularUserId, notificationId, body } = props;

  const notification =
    await MyGlobal.prisma.event_registration_notifications.findUnique({
      where: { id: notificationId },
    });

  if (!notification) throw new Error("Notification not found");

  if (notification.user_id !== regularUserId) {
    throw new Error(
      "Unauthorized: notification does not belong to the specified user",
    );
  }

  const updateData: {
    user_id?: string | null;
    type?: string | null;
    content?: string | null;
    read?: boolean | null;
    deleted_at?: (string & tags.Format<"date-time">) | null;
  } = {};

  if ("user_id" in body) {
    updateData.user_id = body.user_id === null ? null : body.user_id;
  }
  if ("type" in body) {
    updateData.type = body.type === null ? null : body.type;
  }
  if ("content" in body) {
    updateData.content = body.content === null ? null : body.content;
  }
  if ("read" in body) {
    updateData.read = body.read === null ? null : body.read;
  }
  if ("deleted_at" in body) {
    updateData.deleted_at =
      body.deleted_at === null ? null : toISOStringSafe(body.deleted_at);
  }

  const updated = await MyGlobal.prisma.event_registration_notifications.update(
    {
      where: { id: notificationId },
      data: updateData,
    },
  );

  return {
    id: updated.id,
    user_id: updated.user_id ?? null,
    type: updated.type,
    content: updated.content,
    read: updated.read,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
