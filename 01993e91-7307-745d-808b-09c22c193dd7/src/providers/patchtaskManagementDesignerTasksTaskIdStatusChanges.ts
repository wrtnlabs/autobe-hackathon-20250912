import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { IPageITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatusChange";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Paginated list retrieval of task status changes by task ID.
 *
 * Retrieves a filtered and paginated list of status change history entries for
 * the given task. This method allows authorized users to track the full
 * lifecycle of task status changes by returning detailed audit trail data
 * including new status, change timestamps, and optional admin comments.
 *
 * @param props - Object containing the authenticated designer, task ID, and
 *   request filters
 * @param props.designer - The authenticated designer making the request
 * @param props.taskId - Unique identifier of the target task
 * @param props.body - Request body for searching and pagination of task status
 *   changes
 * @returns A paginated list of task status change records
 * @throws {Error} Throws error if database operations fail
 */
export async function patchtaskManagementDesignerTasksTaskIdStatusChanges(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IRequest;
}): Promise<IPageITaskManagementTaskStatusChange> {
  const { taskId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    task_id: taskId,
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_status_changes.findMany({
      where,
      orderBy: { changed_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_task_status_changes.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
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
