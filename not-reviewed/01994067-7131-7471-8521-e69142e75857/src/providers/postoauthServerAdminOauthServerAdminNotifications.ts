import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new admin notification in oauth_server_admin_notifications
 *
 * This operation creates a new administrative notification for OAuth server
 * administrators. It accepts data specifying the admin ID recipient, message
 * title, message content, and read status. The operation inserts a new entry
 * into the oauth_server_admin_notifications table with creation and update
 * timestamps, initializing it as active (deleted_at = null).
 *
 * Only authorized admin users can perform this action.
 *
 * @param props - Object containing the authenticated admin and notification
 *   creation data
 * @param props.admin - The authenticated administrator creating the
 *   notification
 * @param props.body - Notification creation payload including admin_id, title,
 *   message, and is_read
 * @returns The newly created admin notification entity with all fields
 * @throws {Error} When database operation fails or input is invalid
 */
export async function postoauthServerAdminOauthServerAdminNotifications(props: {
  admin: AdminPayload;
  body: IOauthServerAdminNotification.ICreate;
}): Promise<IOauthServerAdminNotification> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.oauth_server_admin_notifications.create(
    {
      data: {
        id: newId,
        admin_id: body.admin_id,
        title: body.title,
        message: body.message,
        is_read: body.is_read,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    admin_id: created.admin_id,
    title: created.title,
    message: created.message,
    is_read: created.is_read,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
