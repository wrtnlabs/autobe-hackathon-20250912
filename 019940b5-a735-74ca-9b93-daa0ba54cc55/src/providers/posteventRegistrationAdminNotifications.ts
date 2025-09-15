import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new notification record
 *
 * This API operation creates a notification entry in the
 * event_registration_notifications table, capturing information like associated
 * user (nullable), notification type, content, read status, and timestamps.
 * This operation is restricted to admins and must generate a UUID for the
 * record.
 *
 * @param props - The parameters for creating a notification
 * @param props.admin - The authenticated admin performing this action
 * @param props.body - The notification creation details
 * @returns The created notification record with all fields populated
 * @throws {Error} Throws error if the creation fails due to database or
 *   validation reasons
 */
export async function posteventRegistrationAdminNotifications(props: {
  admin: AdminPayload;
  body: IEventRegistrationNotification.ICreate;
}): Promise<IEventRegistrationNotification> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.event_registration_notifications.create(
    {
      data: {
        id: newId,
        user_id: body.user_id ?? null,
        type: body.type,
        content: body.content,
        read: body.read,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id,
    user_id: created.user_id ?? null,
    type: created.type,
    content: created.content,
    read: created.read,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
