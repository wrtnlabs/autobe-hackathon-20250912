import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Search and retrieve a filtered paginated list of notifications for the
 * authenticated PMO user.
 *
 * This endpoint allows PMO users to fetch their notifications with filtering
 * options such as notification_type, search string, and read status, and
 * supports pagination.
 *
 * @param props - Object containing the authenticated PMO payload and filter
 *   criteria
 * @param props.pmo - Authenticated PMO user information
 * @param props.body - Request body containing search and pagination parameters
 * @returns Paginated list of notification summaries matching the criteria
 * @throws {Error} Throws if database query fails or unexpected errors occur
 */
export async function patchtaskManagementPmoNotifications(props: {
  pmo: PmoPayload;
  body: ITaskManagementNotification.IRequest;
}): Promise<IPageITaskManagementNotification.ISummary> {
  const { pmo, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build where conditions based on filters while handling null and undefined correctly
  const whereConditions = {
    user_id: pmo.id,
    deleted_at: null as null,
    ...(body.notification_type !== undefined && body.notification_type !== null
      ? { notification_type: { contains: body.notification_type } }
      : {}),
    ...(body.is_read !== undefined && body.is_read !== null
      ? { is_read: body.is_read }
      : {}),
    ...(body.search !== undefined && body.search !== null
      ? { notification_type: { contains: body.search } }
      : {}),
  };

  // Execute parallel queries for records list and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.task_management_notifications.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_notifications.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      user_id: record.user_id,
      task_id: record.task_id === null ? null : record.task_id,
      notification_type: record.notification_type,
      is_read: record.is_read,
      read_at: record.read_at === null ? null : toISOStringSafe(record.read_at),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
