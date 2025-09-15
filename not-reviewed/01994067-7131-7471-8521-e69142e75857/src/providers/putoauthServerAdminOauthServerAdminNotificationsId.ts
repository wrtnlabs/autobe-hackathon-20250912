import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdminNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a specific admin notification in oauth_server_admin_notifications
 *
 * This operation updates the title, message, and read status fields of the
 * specified admin notification by its unique ID. The updated_at timestamp is
 * refreshed accordingly.
 *
 * Only authenticated admin users can perform this operation.
 *
 * @param props - Object containing the authenticated admin user, the
 *   notification ID, and the update payload
 * @param props.admin - Authenticated admin user performing the update
 * @param props.id - Unique identifier of the admin notification to update
 * @param props.body - Fields to update: title, message, is_read, deleted_at
 *   (nullable)
 * @returns The updated admin notification entity
 * @throws {Error} If the specified notification ID does not exist
 */
export async function putoauthServerAdminOauthServerAdminNotificationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerAdminNotification.IUpdate;
}): Promise<IOauthServerAdminNotification> {
  const { admin, id, body } = props;

  // Authorization must be enforced outside of this function

  // Compose update data with provided fields; skip undefined
  const updatedAt = toISOStringSafe(new Date());
  const data: IOauthServerAdminNotification.IUpdate = {
    title: body.title ?? undefined,
    message: body.message ?? undefined,
    is_read: body.is_read ?? undefined,
    deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
    updated_at: updatedAt,
  };

  const updated = await MyGlobal.prisma.oauth_server_admin_notifications.update(
    {
      where: { id },
      data,
    },
  );

  return {
    id: updated.id,
    admin_id: updated.admin_id,
    title: updated.title,
    message: updated.message,
    is_read: updated.is_read,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
