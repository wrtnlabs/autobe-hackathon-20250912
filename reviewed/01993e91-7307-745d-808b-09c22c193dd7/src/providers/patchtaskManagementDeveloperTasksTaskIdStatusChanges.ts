import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Paginated list retrieval of task status changes by task ID.
 *
 * This operation retrieves a paginated list of status change records associated
 * with a specified task. It returns detailed audit trail data including new
 * status, change timestamps, and optional comments. The operation requires
 * developer role authorization and filters by the taskId path parameter.
 *
 * @param props - Object containing the authenticated developer, task ID, and
 *   request body
 * @param props.developer - The authenticated developer making the request
 * @param props.taskId - Unique identifier of the target task
 * @param props.body - Request body with filter and pagination parameters
 * @returns Paginated list of task status change records
 * @throws {Error} When the task ID is invalid or no records are found
 */
export async function patchtaskManagementDeveloperTasksTaskIdStatusChanges(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IRequest;
}): Promise<IPageITaskManagementTaskStatusChange> {
  const { developer, taskId, body } = props;

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Fetch paginated data and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_status_changes.findMany({
      where: { task_id: taskId },
      orderBy: { changed_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_task_status_changes.count({
      where: { task_id: taskId },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      task_id: item.task_id,
      new_status_id: item.new_status_id,
      changed_at: toISOStringSafe(item.changed_at),
      comment: item.comment ?? null,
    })),
  };
}
