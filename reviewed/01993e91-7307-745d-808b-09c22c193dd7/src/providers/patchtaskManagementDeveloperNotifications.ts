import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves a filtered and paginated list of developer notifications.
 *
 * This operation returns notifications belonging exclusively to the
 * authenticated developer user. Supports filtering by notification type, read
 * status, and a search string applied to notification type. Pagination
 * parameters page and limit control the response size and offset.
 *
 * @param props - An object containing the developer payload and filter criteria
 *   in the request body.
 * @param props.developer - Authenticated developer user information.
 * @param props.body - Filter and pagination parameters for notifications.
 * @returns A paginated list of notification summaries matching the provided
 *   criteria.
 * @throws {Error} When database access fails or parameters are invalid.
 */
export async function patchtaskManagementDeveloperNotifications(props: {
  developer: DeveloperPayload;
  body: ITaskManagementNotification.IRequest;
}): Promise<IPageITaskManagementNotification.ISummary> {
  const { developer, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    user_id: developer.id,
    deleted_at: null,
    ...(body.notification_type !== undefined &&
      body.notification_type !== null && {
        notification_type: body.notification_type,
      }),
    ...(body.is_read !== undefined &&
      body.is_read !== null && {
        is_read: body.is_read,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        notification_type: { contains: body.search },
      }),
  };

  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.task_management_notifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        task_id: true,
        notification_type: true,
        is_read: true,
        read_at: true,
        created_at: true,
        updated_at: true,
      },
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
    data: notifications.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      task_id: item.task_id ?? null,
      notification_type: item.notification_type,
      is_read: item.is_read,
      read_at: item.read_at ? toISOStringSafe(item.read_at) : null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
