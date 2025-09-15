import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Search and retrieve a filtered paginated list of notifications for the
 * authenticated PM user.
 *
 * This endpoint fetches notifications from the task_management_notifications
 * table filtered by user_id, applies optional filters such as
 * notification_type, is_read, and search keyword, and supports pagination.
 *
 * @param props - Object containing pm payload for authorization and filter
 *   criteria in body.
 * @param props.pm - Authenticated PM user's payload with id and type.
 * @param props.body - Filter and pagination info including page, limit, search,
 *   notification_type, and is_read.
 * @returns Paginated list of notification summaries matching search and filter
 *   criteria.
 * @throws Error - Throws if any unexpected error occurs during DB operations.
 */
export async function patchtaskManagementPmNotifications(props: {
  pm: PmPayload;
  body: ITaskManagementNotification.IRequest;
}): Promise<IPageITaskManagementNotification.ISummary> {
  const { pm, body } = props;

  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 10;
  const skip = (page - 1) * limit;

  const where: {
    user_id: string & tags.Format<"uuid">;
    deleted_at: null;
    notification_type?: string;
    is_read?: boolean;
    OR?: { notification_type: { contains: string } }[];
  } = {
    user_id: pm.id,
    deleted_at: null,
  };

  if (body.notification_type !== undefined && body.notification_type !== null) {
    where.notification_type = body.notification_type;
  }

  if (body.is_read !== undefined && body.is_read !== null) {
    where.is_read = body.is_read;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [{ notification_type: { contains: body.search } }];
  }

  const [total, records] = await Promise.all([
    MyGlobal.prisma.task_management_notifications.count({ where }),
    MyGlobal.prisma.task_management_notifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
  ]);

  const data = records.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    user_id: record.user_id as string & tags.Format<"uuid">,
    task_id:
      record.task_id === null
        ? null
        : (record.task_id as string & tags.Format<"uuid">),
    notification_type: record.notification_type,
    is_read: record.is_read,
    read_at: record.read_at ? toISOStringSafe(record.read_at) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data,
  };
}
