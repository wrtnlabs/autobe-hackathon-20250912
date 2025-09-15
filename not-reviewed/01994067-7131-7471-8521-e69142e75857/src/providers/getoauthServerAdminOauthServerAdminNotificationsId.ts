import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information about a specific administrative notification.
 *
 * This function fetches an admin notification by its unique ID from the
 * oauth_server_admin_notifications table. Only authenticated admins are
 * authorized to use this endpoint. It returns the notification's title, message
 * content, read status, associated timestamps, and soft delete flag.
 *
 * @param props - Object containing:
 *
 *   - Admin: The authenticated admin user requesting the notification.
 *   - Id: UUID identifier of the notification to fetch.
 *
 * @returns The complete admin notification entity.
 * @throws {Error} Throws if the notification does not exist or is soft deleted.
 */
export async function getoauthServerAdminOauthServerAdminNotificationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerAdminNotification> {
  const { admin, id } = props;

  const notification =
    await MyGlobal.prisma.oauth_server_admin_notifications.findUniqueOrThrow({
      where: {
        id,
        deleted_at: null,
      },
    });

  return {
    id: notification.id,
    admin_id: notification.admin_id,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : null,
  };
}
