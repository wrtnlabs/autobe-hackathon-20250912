import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Search and retrieve a filtered paginated list of notifications for the user.
 *
 * This endpoint provides a filtered and paginated view of the user's
 * notifications within the task management system. Notifications can come from
 * task assignments, status changes, comments, or general alerts.
 *
 * The operation lets users search, sort, and paginate through their
 * notifications efficiently.
 *
 * Only notifications belonging to the authenticated QA user are returned.
 *
 * @param props - Object containing the authenticated QA user payload and the
 *   request body for filtering
 * @param props.qa - The authenticated QA user making the request
 * @param props.body - Request body containing search criteria and pagination
 *   parameters
 * @returns The paginated list of notification summaries matching search
 *   criteria
 * @throws {Error} If any database query fails or the user is unauthorized
 */
export async function patchtaskManagementQaNotifications(props: {
  qa: QaPayload;
  body: ITaskManagementNotification.IRequest;
}): Promise<IPageITaskManagementNotification.ISummary> {
  const { qa, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    user_id: string & tags.Format<"uuid">;
    notification_type?: string | { contains: string };
    is_read?: boolean;
  } = {
    user_id: qa.id,
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

  const [notifications, count] = await Promise.all([
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
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: notifications.map((notification) => ({
      id: notification.id,
      user_id: notification.user_id,
      task_id: notification.task_id ?? null,
      notification_type: notification.notification_type,
      is_read: notification.is_read,
      read_at: notification.read_at
        ? toISOStringSafe(notification.read_at)
        : null,
      created_at: toISOStringSafe(notification.created_at),
      updated_at: toISOStringSafe(notification.updated_at),
    })),
  };
}
