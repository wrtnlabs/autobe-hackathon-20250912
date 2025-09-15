import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Search and retrieve a filtered paginated list of notifications for the user.
 *
 * This endpoint returns notifications for the authenticated designer user,
 * supporting filters such as notification type, read status, and search text
 * within notification types. Pagination is applied with page and limit.
 *
 * Only notifications belonging to the authenticated designer user and not soft
 * deleted are returned.
 *
 * @param props - Object containing the authenticated designer and request body
 *   with filters
 * @param props.designer - The authenticated designer user making the request
 * @param props.body - The request body containing search criteria and
 *   pagination parameters
 * @returns Paginated summary of notifications matching the filters
 * @throws {Error} If any unexpected error occurs during database access
 */
export async function patchtaskManagementDesignerNotifications(props: {
  designer: DesignerPayload;
  body: ITaskManagementNotification.IRequest;
}): Promise<IPageITaskManagementNotification.ISummary> {
  const { designer, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    user_id: string & tags.Format<"uuid">;
    deleted_at: null;
    notification_type?: string;
    is_read?: boolean;
  } = {
    user_id: designer.id,
    deleted_at: null,
  };

  if (body.notification_type !== undefined && body.notification_type !== null) {
    where.notification_type = body.notification_type;
  }
  if (body.is_read !== undefined && body.is_read !== null) {
    where.is_read = body.is_read;
  }
  if (body.search !== undefined && body.search !== null) {
    where.notification_type = { contains: body.search };
  }

  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.task_management_notifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_notifications.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: notifications.map((notif) => ({
      id: notif.id,
      user_id: notif.user_id,
      task_id: notif.task_id === null ? null : notif.task_id,
      notification_type: notif.notification_type,
      is_read: notif.is_read,
      read_at: notif.read_at ? toISOStringSafe(notif.read_at) : null,
      created_at: toISOStringSafe(notif.created_at),
      updated_at: toISOStringSafe(notif.updated_at),
    })),
  };
}
