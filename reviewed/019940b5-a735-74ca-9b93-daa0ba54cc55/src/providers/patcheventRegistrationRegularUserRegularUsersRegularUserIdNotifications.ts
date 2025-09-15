import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotifications";
import { IPageIEventRegistrationNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotifications";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve a paginated list of notifications for a specific regular user. Only
 * the authenticated user matching the requested regularUserId can access.
 * Supports pagination and filtering by notification type and read status.
 *
 * @param props - Object containing authenticated user, target user ID, and
 *   filter options
 * @param props.regularUser - The authenticated regular user payload
 * @param props.regularUserId - UUID of the regular user to retrieve
 *   notifications
 * @param props.body - Filter and pagination options for notifications
 * @returns Paginated notifications belonging to the specified user
 * @throws {Error} When unauthorized access is attempted
 */
export async function patcheventRegistrationRegularUserRegularUsersRegularUserIdNotifications(props: {
  regularUser: RegularuserPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationNotifications.IRequest;
}): Promise<IPageIEventRegistrationNotifications> {
  const { regularUser, regularUserId, body } = props;

  if (regularUser.id !== regularUserId) {
    throw new Error(
      "Unauthorized: Cannot access notifications for another user",
    );
  }

  const page = (body.page ?? 1) as unknown as number;
  const limit = (body.limit ?? 10) as unknown as number;
  const skip = (page - 1) * limit;

  const where = {
    user_id: regularUserId,
    deleted_at: null,
    ...(body.type !== undefined && body.type !== null && { type: body.type }),
    ...(body.read !== undefined && body.read !== null && { read: body.read }),
  };

  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.event_registration_notifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_notifications.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: notifications.map((notification) => ({
      id: notification.id,
      user_id: notification.user_id ?? null,
      type: notification.type,
      content: notification.content,
      read: notification.read,
      created_at: toISOStringSafe(notification.created_at),
      updated_at: toISOStringSafe(notification.updated_at),
      deleted_at: notification.deleted_at
        ? toISOStringSafe(notification.deleted_at)
        : null,
    })),
  };
}
