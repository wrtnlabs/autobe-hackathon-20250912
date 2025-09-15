import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Search and retrieve a filtered paginated list of notifications for the user.
 *
 * This endpoint provides a filtered and paginated view of the user's
 * notifications within the task management system. Notifications can come from
 * task assignments, status changes, comments, or general alerts.
 *
 * This function fetches notifications belonging only to the authenticated TPM
 * user identified by their unique ID. It supports optional filters for
 * notification type, read status, and free text search on notification type
 * strings.
 *
 * Pagination parameters allow control over the page and number of results.
 *
 * @param props - Object containing TPM user payload and request filters with
 *   pagination.
 * @param props.tpm - Authenticated TPM user payload containing unique user ID.
 * @param props.body - Request body with search criteria and pagination
 *   parameters.
 * @returns A paginated summary list of notifications matching the filter
 *   criteria.
 * @throws Error if database access or query fails.
 */
export async function patchtaskManagementTpmNotifications(props: {
  tpm: TpmPayload;
  body: ITaskManagementNotification.IRequest;
}): Promise<IPageITaskManagementNotification.ISummary> {
  const { tpm, body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with required user_id and soft delete filter
  const where: {
    user_id: string & tags.Format<"uuid">;
    deleted_at: null;
    notification_type?: { contains: string };
    is_read?: boolean;
  } = {
    user_id: tpm.id,
    deleted_at: null,
  };

  // Apply filters
  if (body.is_read !== undefined && body.is_read !== null) {
    where.is_read = body.is_read;
  }

  if (body.search !== undefined && body.search !== null) {
    // If search provided, use it on notification_type
    where.notification_type = { contains: body.search };
  } else if (
    body.notification_type !== undefined &&
    body.notification_type !== null
  ) {
    where.notification_type = { contains: body.notification_type };
  }

  // Query notifications and total count in parallel
  const [notifications, total] = await Promise.all([
    MyGlobal.prisma.task_management_notifications.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_notifications.count({ where }),
  ]);

  // Construct paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: notifications.map((n) => ({
      id: n.id,
      user_id: n.user_id,
      task_id: n.task_id ?? null,
      notification_type: n.notification_type,
      is_read: n.is_read,
      read_at: n.read_at ? toISOStringSafe(n.read_at) : null,
      created_at: toISOStringSafe(n.created_at),
      updated_at: toISOStringSafe(n.updated_at),
    })),
  };
}
